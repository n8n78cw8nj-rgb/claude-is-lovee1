# «Ожившее фото» без внешних сервисов: портрет моргает и чуть покачивает головой, 8 секунд по кругу.
#
#   python3 scripts/animate_photo.py <фото> public/videos/animated-portrait.mp4
#
# Нужны Python 3.9–3.12, ffmpeg и пакеты: pip install mediapipe==0.10.14 opencv-python-headless scipy
# (модель лица — внутри пакета mediapipe, интернет при запуске не нужен).
#
# Как устроено: сетка из 468 точек лица (MediaPipe Face Mesh) и редкая решётка по кадру, треугольники
# деформируются по отдельности. Голова качается вокруг шеи, движение плавно гаснет к фону и плечам.
# При моргании верхнее веко опускается до нижнего, кожа над ним тянется следом, а сам глаз под веком
# остаётся неподвижным. Все движения периодические — ролик зацикливается без шва.
import math
import os
import subprocess
import sys
import tempfile

import cv2
import mediapipe as mp
import numpy as np
from scipy.spatial import Delaunay

FPS, T = 30, 8.0
WORK_W, WORK_H = 1080, 1350  # считаем крупнее, сохраняем 720×900 — так края мягче
OUT_W, OUT_H = 720, 900
BLINKS = (2.1, 6.0)  # секунды цикла, когда он моргает

EYES = {
    'right': dict(upper=[246, 161, 160, 159, 158, 157, 173], lower=[7, 163, 144, 145, 153, 154, 155], corners=[33, 133]),
    'left': dict(upper=[466, 388, 387, 386, 385, 384, 398], lower=[249, 390, 373, 374, 380, 381, 382], corners=[263, 362]),
}
FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149,
             150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]


def load(path):
    """Портрет 4:5 (обрезка по центру) в рабочем размере"""
    img = cv2.imread(path)
    if img is None:
        sys.exit(f'не открылось фото: {path}')
    h, w = img.shape[:2]
    if w / h > WORK_W / WORK_H:
        nw = round(h * WORK_W / WORK_H)
        img = img[:, (w - nw) // 2:(w - nw) // 2 + nw]
    else:
        nh = round(w * WORK_H / WORK_W)
        img = img[(h - nh) // 2:(h - nh) // 2 + nh]
    return cv2.resize(img, (WORK_W, WORK_H), interpolation=cv2.INTER_AREA)


def landmarks(img):
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True, refine_landmarks=False, max_num_faces=1,
                                         min_detection_confidence=0.3) as fm:
        res = fm.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    if not res.multi_face_landmarks:
        sys.exit('лицо на фото не найдено — нужен портрет, лицо в анфас')
    h, w = img.shape[:2]
    return np.array([[p.x * w, p.y * h] for p in res.multi_face_landmarks[0].landmark], dtype=np.float64)[:468]


def smooth(s):
    s = np.clip(s, 0, 1)
    return s * s * (3 - 2 * s)


def blink(t):
    """0 — глаза открыты, 1 — закрыты"""
    v = 0.0
    for t0 in BLINKS:
        s = t - t0
        if 0 <= s < 0.10:
            v = max(v, (s / 0.10) ** 2)
        elif 0.10 <= s < 0.15:
            v = 1.0
        elif 0.15 <= s < 0.37:
            v = max(v, (1 - (s - 0.15) / 0.22) ** 2)
    return v


def main(src, out):
    img = load(src)
    H, W = img.shape[:2]
    P = landmarks(img)
    n_mesh = len(P)

    oval = P[FACE_OVAL]
    cx, cy = oval[:, 0].mean(), oval[:, 1].mean()
    a = (oval[:, 0].max() - oval[:, 0].min()) / 2
    b = (oval[:, 1].max() - oval[:, 1].min()) / 2
    chin_y = P[152, 1]
    pivot = np.array([cx, chin_y + 0.55 * b])  # шея: голова качается вокруг неё

    # опорные точки: сетка лица + редкая решётка по остальному кадру
    hull = cv2.convexHull(P.astype(np.float32))
    step = 54
    xs = np.unique(np.concatenate([np.arange(0, W, step), [W - 1]]))
    ys = np.unique(np.concatenate([np.arange(0, H, step), [H - 1]]))
    grid = [(x, y) for y in ys for x in xs if cv2.pointPolygonTest(hull, (float(x), float(y)), True) < -16]
    C = np.vstack([P, np.array(grid, dtype=np.float64)])
    tri = Delaunay(C).simplices
    S = C[tri]

    # насколько точка следует за головой: 1 на лице и волосах, плавно к 0 у фона и плеч
    dx = (C[:, 0] - cx) / a
    dy = (C[:, 1] - cy) / np.where(C[:, 1] < cy, b * 1.35, b)
    Wt = smooth((2.0 - np.sqrt(dx * dx + dy * dy)) / (2.0 - 1.08))
    Wt = np.where(C[:, 1] > chin_y, Wt * smooth(1 - (C[:, 1] - chin_y) / (0.75 * b)), Wt)
    Wt[:n_mesh] = 1.0
    Wt[(C[:, 0] <= 0) | (C[:, 0] >= W - 1) | (C[:, 1] <= 0) | (C[:, 1] >= H - 1)] = 0.0

    # моргание: на сколько опускается точка при полностью закрытых глазах
    K = np.zeros(n_mesh)
    lids = []  # контур открытой части глаза: опущенное верхнее веко + нижнее веко
    on_eye = {i for e in EYES.values() for i in e['upper'] + e['lower'] + e['corners']}
    for e in EYES.values():
        up, lo = e['upper'] + e['corners'], e['lower'] + e['corners']
        ou, ol = np.argsort(P[up, 0]), np.argsort(P[lo, 0])
        upper_y = lambda x, q=P[up][ou]: np.interp(x, q[:, 0], q[:, 1])
        lower_y = lambda x, q=P[lo][ol]: np.interp(x, q[:, 0], q[:, 1])
        xmin, xmax = P[e['corners'], 0].min(), P[e['corners'], 0].max()
        ew = xmax - xmin
        for i in e['upper']:
            K[i] = 0.98 * (lower_y(P[i, 0]) - P[i, 1])  # край века доходит до нижнего
        Hc = 0.85 * ew
        for i in range(n_mesh):
            x, y = P[i]
            if i in on_eye or x < xmin - 0.2 * ew or x > xmax + 0.2 * ew:
                continue
            xc = min(max(x, xmin), xmax)
            du = upper_y(xc) - y
            if 0 < du <= Hc:  # кожа века разглаживается до брови
                side = 1.0 - min(1.0, abs(x - xc) / (0.2 * ew))
                K[i] = side * 0.98 * (1 - du / Hc) ** 1.5 * (lower_y(xc) - upper_y(xc))
        lids.append((np.array(up)[ou], np.array(lo)[ol][::-1]))

    X, Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))

    def warp(dst):
        D = dst[tri]
        AT = np.linalg.solve(np.concatenate([D, np.ones((len(tri), 3, 1))], axis=2), S)  # точка кадра → точка фото
        ids = np.full((H, W), -1, np.int32)
        for k, tr in enumerate(np.round(D).astype(np.int32)):
            cv2.fillConvexPoly(ids, tr, k)
        A = AT[np.maximum(ids, 0)]
        mx = A[..., 0, 0] * X + A[..., 1, 0] * Y + A[..., 2, 0]
        my = A[..., 0, 1] * X + A[..., 1, 1] * Y + A[..., 2, 1]
        miss = ids < 0
        mx[miss], my[miss] = X[miss], Y[miss]
        return cv2.remap(img, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)

    with tempfile.TemporaryDirectory() as tmp:
        n = int(FPS * T)
        for f in range(n):
            t = f / FPS
            th = math.radians(0.9) * math.sin(2 * math.pi * t / T)
            shift = np.array([3.0 * math.sin(2 * math.pi * t / T + 0.6), 2.2 * math.sin(4 * math.pi * t / T + 1.1)])
            R = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])

            def head(p):
                return p + Wt[:, None] * ((p - pivot) @ R.T + pivot + shift - p)

            still = head(C)
            bl = blink(t)
            if bl > 0:
                moved = C.copy()
                moved[:n_mesh, 1] += bl * K
                moved = head(moved)
                lid = warp(moved).astype(np.float32)
                eye = warp(still).astype(np.float32)
                # между опущенным веком и нижним веком виден неподвижный глаз
                mask = np.zeros((H * 4, W * 4), np.uint8)
                for up, lo in lids:
                    cv2.fillPoly(mask, [np.round(np.vstack([moved[up], still[lo]]) * 4).astype(np.int32)], 255, cv2.LINE_AA)
                mask = cv2.resize(mask, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)[..., None] / 255
                frame = (lid * (1 - mask) + eye * mask).clip(0, 255).astype(np.uint8)
            else:
                frame = warp(still)
            cv2.imwrite(os.path.join(tmp, f'{f:04d}.png'), cv2.resize(frame, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA))
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', os.path.join(tmp, '%04d.png'),
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                        '-an', out], check=True)
    print(f'{out}: {OUT_W}×{OUT_H}, {T:.0f} с, {os.path.getsize(out) // 1024} КБ')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('python3 scripts/animate_photo.py <фото> <видео.mp4>')
    main(sys.argv[1], sys.argv[2])
