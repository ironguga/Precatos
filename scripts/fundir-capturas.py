import numpy as np
from PIL import Image, ImageOps, ImageFilter

U='/root/.claude/uploads/12bc1a6b-4910-5e2a-8e16-b128627e4baa'
A='/home/user/Precatos/arquivo/assentos'

def prep(path, box, out_w=1400, out_h=460):
    im = Image.open(path).convert('L'); w,h = im.size
    c = im.crop((int(w*box[0]), int(h*box[1]), int(w*box[2]), int(h*box[3])))
    c = c.resize((out_w, out_h), Image.LANCZOS)
    a = np.asarray(c, dtype=np.float32)
    bg = np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(24)), dtype=np.float32)+1e-3
    r = a/bg
    p1,p2 = np.percentile(r,[1,70])
    r = np.clip((r-p1)/(p2-p1),0,1)
    return r

# a mesma palavra, nas duas capturas independentes
fs  = prep(f'{U}/181bce43-image.jpg', (0.3885,0.3835,0.4325,0.4085))
abm = prep(f'{A}/170550-dissem.jpg',  (0.7220,0.3705,0.8060,0.3985))

# alinhamento por procura exaustiva de deslocamento (correlacao da tinta)
best=None
for dy in range(-40,41,2):
    for dx in range(-60,61,2):
        b = np.roll(np.roll(abm, dy, 0), dx, 1)
        s = float(((1-fs)*(1-b)).sum())
        if best is None or s>best[0]: best=(s,dx,dy)
s,dx,dy = best
print('deslocamento', dx, dy, 'pontuacao', round(s))
b = np.roll(np.roll(abm, dy, 0), dx, 1)

Image.fromarray((np.minimum(fs,b)*255).astype(np.uint8)).save('fuse_min.png')   # tinta de qualquer uma
Image.fromarray((((fs+b)/2)*255).astype(np.uint8)).save('fuse_avg.png')          # media
Image.fromarray((np.maximum(fs,b)*255).astype(np.uint8)).save('fuse_max.png')    # so o que as duas concordam ser tinta
