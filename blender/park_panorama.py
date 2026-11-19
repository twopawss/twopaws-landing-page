"""TwoPaws park panorama: ONE continuous daylight park that the page pans across on scroll.

Four stops along the park, left to right: cabin (home), vet clinic (care), market stall (shop), pet hotel (stay).
Rendered with an orthographic camera as two long strips so they pan with parallax:
  <out_dir>/park-fg.webp  foreground: ground, buildings, pets, trees (transparent)
  <out_dir>/park-bg.webp  background: sky, clouds, far hills, treeline (opaque, narrower so it moves slower)

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/park_panorama.py -- <out_dir> [samples] [height_px]
"""
import bpy, bmesh, sys, os, random
from math import radians, sqrt

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_DIR = argv[0] if argv else "//"
SAMPLES = int(argv[1]) if len(argv) > 1 else 128
H_PX = int(argv[2]) if len(argv) > 2 else 1200

# ---- layout (world units). Keep in sync with PARK in client/src/pages/clay-preview.tsx ----
VIEW_H = 13.0            # visible height
CAM_Z = 5.0              # camera height: frame shows z from -1.5 to 11.5
FG_W = 93.0              # foreground strip width
BG_W = FG_W * 0.62       # background strip width (pans at 62% speed)
STOPS = [18.3 + 22.0 * i for i in range(4)]   # x of each building

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
rnd = random.Random(11)

LAYERS = {"bg": [], "fg": []}
CURRENT = "bg"


def reg(o):
    LAYERS[CURRENT].append(o)
    return o


# ---------- materials ----------
def lin(c):
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


_mats = {}


def matte(hexcol, rough=0.85):
    key = (hexcol, rough)
    if key not in _mats:
        m = bpy.data.materials.new(hexcol)
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = hexrgb(hexcol)
        b.inputs["Roughness"].default_value = rough
        _mats[key] = m
    return _mats[key]


def painted(name, hex_a, hex_b, scale=0.3, stretch=(0.35, 1, 1)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.9
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = stretch
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 6
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.38
    ramp.color_ramp.elements[0].color = hexrgb(hex_a)
    ramp.color_ramp.elements[1].position = 0.66
    ramp.color_ramp.elements[1].color = hexrgb(hex_b)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    return m


def emit(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*rgb, 1)
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
    return m


# app colours
YELLOW, ORANGE = matte("#FEC329"), matte("#E79A12")
PINK, PURPLE = matte("#DF93C0"), matte("#783F6A")
WHITE, DARK = matte("#FFFFFF"), matte("#2A1626", 0.4)
TRUNK = matte("#5E3256")
PURPLE_TREE = ("#783F6A", "#93508A", "#B06AA4")
YELLOW_TREE = ("#F9B91A", "#FEC329", "#FFD768")


# ---------- mesh helpers ----------
def finish(obj, mat, smooth=True):
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = smooth
    return reg(obj)


def ball(mat, loc, scale=(1, 1, 1), rot=(0, 0, 0), seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc,
                                         rotation=[radians(a) for a in rot])
    o = bpy.context.object
    o.scale = scale if isinstance(scale, tuple) else (scale,) * 3
    return finish(o, mat)


def box(mat, loc, size, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=[radians(a) for a in rot])
    o = bpy.context.object
    o.scale = size
    return finish(o, mat, smooth=False)


def cyl(mat, loc, r, depth, rot=(0, 0, 0), r2=None):
    kw = dict(vertices=64, depth=depth, location=loc, rotation=[radians(a) for a in rot])
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, **kw)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, **kw)
    return finish(bpy.context.object, mat)


def torus(mat, loc, R, r):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=64, minor_segments=20, location=loc)
    return finish(bpy.context.object, mat)


def tube(mat, pts, radius):
    cu = bpy.data.curves.new("tube", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 8
    cu.use_fill_caps = True
    sp = cu.splines.new("NURBS")
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (*co, 1)
    sp.use_endpoint_u = True
    sp.order_u = 3
    sp.resolution_u = 16
    o = bpy.data.objects.new("tube", cu)
    scene.collection.objects.link(o)
    cu.materials.append(mat)
    return reg(o)


def prism(mat, half_w, base_z, apex_z, half_d):
    me = bpy.data.meshes.new("prism")
    bm = bmesh.new()
    f = [bm.verts.new(c) for c in ((-half_w, -half_d, base_z), (half_w, -half_d, base_z), (0, -half_d, apex_z))]
    b = [bm.verts.new(c) for c in ((-half_w, half_d, base_z), (half_w, half_d, base_z), (0, half_d, apex_z))]
    bm.faces.new(f)
    bm.faces.new(b[::-1])
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((f[j], f[i], b[i], b[j]))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("prism", me)
    scene.collection.objects.link(o)
    me.materials.append(mat)
    return reg(o)


def group(name, objs, loc, rot_z=0.0, scale=1.0):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    for o in objs:
        o.parent = e
    e.location = loc
    e.rotation_euler = (0, 0, radians(rot_z))
    e.scale = (scale,) * 3
    return e


# ---------- terrain ----------
WALK, FAR = [], []


def hill(mat, c, r, kind=None):
    o = ball(mat, c, r, seg=128)
    if kind == "walk":
        WALK.append((*c, r))
    elif kind == "far":
        FAR.append((*c, r))
    return o


def height(hills, x, y, floor=-99):
    best = floor
    for cx, cy, cz, r in hills:
        d2 = (x - cx) ** 2 + (y - cy) ** 2
        if d2 < r * r:
            best = max(best, cz + sqrt(r * r - d2))
    return best


def ground_z(x, y):
    return height(WALK, x, y)


# ---------- props ----------
def cabin_parts(sign=False):
    parts = [
        box(WHITE, (0, 0, 0.75), (2.4, 2.0, 1.5)),
        prism(WHITE, 1.2, 1.5, 2.7, 1.0),
        box(PURPLE, (0.767, 0, 2.017), (2.05, 2.5, 0.12), rot=(0, 45, 0)),
        box(PURPLE, (-0.767, 0, 2.017), (2.05, 2.5, 0.12), rot=(0, -45, 0)),
        box(PURPLE, (0, -1.0, 0.4), (0.8, 0.06, 0.8)),                    # door
        cyl(PURPLE, (0, -1.0, 0.8), 0.4, 0.06, rot=(90, 0, 0)),           # door arch
        box(PURPLE, (1.2, 0.0, 0.85), (0.06, 0.9, 0.5)),                  # side window
        box(PINK, (0, -1.25, 0.03), (1.2, 0.5, 0.08)),                    # doorstep
    ]
    if sign:  # clinic: yellow disc with a purple cross
        parts += [cyl(YELLOW, (0, -1.02, 1.95), 0.4, 0.06, rot=(90, 0, 0)),
                  box(PURPLE, (0, -1.07, 1.95), (0.5, 0.05, 0.15)),
                  box(PURPLE, (0, -1.07, 1.95), (0.15, 0.05, 0.5))]
    else:
        parts.append(cyl(YELLOW, (0, -1.0, 1.95), 0.26, 0.06, rot=(90, 0, 0)))  # gable window
    return parts


def stall_parts():
    parts = [box(PURPLE, (0, 0, 0.42), (2.7, 1.0, 0.84)), box(WHITE, (0, 0, 0.88), (2.9, 1.2, 0.1))]
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(box(WHITE, (sx * 1.3, sy * 0.45, 1.25), (0.09, 0.09, 2.5)))
    for i in range(8):  # striped awning
        parts.append(box(YELLOW if i % 2 == 0 else WHITE, (-1.4 + i * 0.4, -0.15, 2.55), (0.4, 1.9, 0.08), rot=(16, 0, 0)))
    parts.append(box(PINK, (-0.8, 0.05, 1.08), (0.8, 0.6, 0.3)))          # crate
    for dx, dy, m in ((-1.0, -0.05, ORANGE), (-0.75, 0.15, YELLOW), (-0.6, -0.08, PURPLE), (-0.95, 0.2, YELLOW)):
        parts.append(ball(m, (dx, dy, 1.27), 0.13))
    parts += [box(WHITE, (0.9, 0.1, 1.2), (0.42, 0.3, 0.55)),             # food bag
              box(YELLOW, (0.9, -0.06, 1.25), (0.26, 0.02, 0.2))]
    return parts


def dog_parts(body=YELLOW, ear=ORANGE, belly=WHITE, collar=PURPLE):
    dog = [
        ball(body, (0, 0, 0.62), (0.52, 0.48, 0.64)),
        ball(belly, (0, -0.26, 0.66), (0.3, 0.26, 0.4)),
        ball(body, (0, -0.1, 1.48), 0.46),
        ball(belly, (0, -0.47, 1.37), (0.25, 0.22, 0.19)),
        ball(DARK, (0, -0.68, 1.43), (0.085, 0.06, 0.06)),
        ball(body, (0, 0.5, 0.45), (0.09, 0.09, 0.34), rot=(-40, 0, 0)),
        torus(collar, (0, -0.06, 1.1), 0.33, 0.06),
        ball(YELLOW, (0, -0.4, 1.02), 0.085),
    ]
    for s in (-1, 1):
        dog += [
            ball(DARK, (s * 0.18, -0.5, 1.6), 0.055),
            ball(ear, (s * 0.44, -0.08, 1.42), (0.13, 0.17, 0.32), rot=(0, s * -12, 0)),
            ball(body, (s * 0.22, -0.36, 0.36), (0.13, 0.13, 0.4)),
            ball(belly, (s * 0.22, -0.48, 0.09), (0.16, 0.2, 0.1)),
            ball(body, (s * 0.44, -0.08, 0.27), (0.27, 0.34, 0.27)),
            ball(belly, (s * 0.52, -0.4, 0.09), (0.15, 0.2, 0.1)),
        ]
    return dog


def cat_parts(fur=WHITE):
    cat = [
        ball(fur, (0, 0, 0.5), (0.38, 0.36, 0.52)),
        ball(fur, (0, -0.06, 1.18), (0.43, 0.37, 0.37)),
        ball(PINK, (0, -0.42, 1.13), (0.045, 0.035, 0.03)),
        torus(YELLOW, (0, -0.03, 0.88), 0.25, 0.05),
        tube(fur, [(0.2, 0.25, 0.15), (0.6, 0.45, 0.1), (0.85, 0.3, 0.45), (0.75, 0.2, 0.9), (0.55, 0.2, 1.05)], 0.075),
    ]
    for s in (-1, 1):
        cat += [
            cyl(fur, (s * 0.25, -0.03, 1.52), 0.17, 0.3, r2=0.02, rot=(0, s * 14, 0)),
            cyl(PINK, (s * 0.25, -0.075, 1.5), 0.1, 0.2, r2=0.01, rot=(0, s * 14, 0)),
            ball(DARK, (s * 0.16, -0.39, 1.24), (0.05, 0.04, 0.065)),
            ball(fur, (s * 0.07, -0.38, 1.08), (0.09, 0.07, 0.065)),
            ball(fur, (s * 0.14, -0.27, 0.28), (0.095, 0.095, 0.3)),
            ball(fur, (s * 0.14, -0.35, 0.07), (0.115, 0.15, 0.075)),
            ball(fur, (s * 0.3, -0.05, 0.2), (0.2, 0.26, 0.2)),
        ]
    return cat


def bench_parts():
    parts = [box(WHITE, (0, 0, 0.45), (1.7, 0.5, 0.08)), box(WHITE, (0, 0.27, 0.85), (1.7, 0.08, 0.42), rot=(-10, 0, 0))]
    for sx in (-0.7, 0.7):
        parts += [box(PURPLE, (sx, -0.17, 0.22), (0.08, 0.08, 0.44)), box(PURPLE, (sx, 0.24, 0.5), (0.08, 0.08, 1.0))]
    return parts


def lamp_parts():
    return [cyl(PURPLE, (0, 0, 1.45), 0.06, 2.9), cyl(PURPLE, (0, 0, 0.08), 0.18, 0.16),
            ball(YELLOW, (0, 0, 3.0), 0.24), cyl(PURPLE, (0, 0, 3.27), 0.2, 0.1, r2=0.05)]


def put(name, parts, x, y, rot_z=0.0, scale=1.0, sink=0.05):
    return group(name, parts, (x, y, ground_z(x, y) - sink), rot_z, scale)


def tree(x, y, trunk_h, crown, tones):
    z = ground_z(x, y) - 0.2
    cyl(TRUNK, (x, y, z + trunk_h / 2), 0.2, trunk_h, r2=0.12)
    for i, (dz, dx, s) in enumerate(((0.0, 0.0, 1.0), (crown * 0.75, 0.35, 0.78), (crown * 1.35, -0.1, 0.56))):
        ball(matte(tones[i], 0.95), (x + dx, y, z + trunk_h + dz), crown * s, seg=64)


def bush(x, y, s, col):
    ball(matte(col, 0.95), (x, y, ground_z(x, y) + s * 0.4), (s * 1.3, s, s))
    ball(matte(col, 0.95), (x + s * 1.1, y + 0.1, ground_z(x + s * 1.1, y + 0.1) + s * 0.25), (s * 0.85, s * 0.7, s * 0.7))


# ===================== BACKGROUND =====================
CURRENT = "bg"
BG_X0 = 0.0  # background strip spans x in [0, BG_W]

# sky: light at the horizon, blue above
sky = bpy.data.materials.new("sky")
sky.use_nodes = True
nt = sky.node_tree
nt.nodes.remove(nt.nodes["Principled BSDF"])
tc = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
els = ramp.color_ramp.elements
els[0].position, els[0].color = 0.36, hexrgb("#EAF6FF")
els[1].position, els[1].color = 0.86, hexrgb("#7CC4F2")
mid = els.new(0.56)
mid.color = hexrgb("#BDE2FA")
em = nt.nodes.new("ShaderNodeEmission")
nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
nt.links.new(em.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
bpy.ops.mesh.primitive_plane_add(size=1, location=(BG_W / 2, 95, CAM_Z), rotation=(radians(90), 0, 0))
bd = bpy.context.object
bd.scale = (BG_W + 60, 20, 1)
bd.data.materials.append(sky)
bd.visible_shadow = False
reg(bd)

ball(emit("sun", (1.0, 0.86, 0.45), 3.0), (BG_W * 0.80, 90, 10.0), 0.85)

cloud = emit("cloud", (1.0, 1.0, 1.0), 1.0)
for cx, cz, s in ((5, 9.4, 0.5), (15.5, 10.6, 0.36), (25, 8.9, 0.46), (35.5, 10.3, 0.4), (46, 9.2, 0.5), (53, 10.7, 0.34)):
    for dx, dz, r in ((0, 0, 2.6), (2.8, -0.4, 2.0), (-2.9, -0.5, 1.9), (5.2, -1.0, 1.3), (-5.0, -1.1, 1.2)):
        c = ball(cloud, (cx + dx * s, 84, cz + dz * s), (r * s * 1.25, r * s, r * s * 0.6), seg=32)
        c.visible_shadow = False

# far rolling hills in #DF93C0
x = -12.0
i = 0
while x < BG_W + 14:
    r = rnd.uniform(15, 20)
    top = rnd.uniform(2.0, 3.0)
    hill(painted(f"far{i}", "#DF93C0" if i % 2 else "#D988B8", "#E5A3CA", 0.12, (1, 1, 1)), (x, 18 + (i % 2) * 3, top - r), r, "far")
    x += rnd.uniform(9, 13)
    i += 1

# treeline of round canopies: three rows, lighter and higher with distance
ROWS = ((30, 1.2, 1.8, 2.1, ("#93508A", "#A8779F"), 0.1), (42, 1.5, 2.3, 2.8, ("#FEC329", "#F9B91A"), 0.7),
        (55, 1.9, 2.8, 3.5, ("#CDA5C5", "#D9B8D2"), 1.3))
for y, r_lo, r_hi, step, tones, lift in ROWS:
    x = -8 + rnd.uniform(0, step)
    while x < BG_W + 8:
        r = rnd.uniform(r_lo, r_hi)
        tall = rnd.choice((1.0, 1.0, 1.2, 1.45))
        yy = y + rnd.uniform(-2, 2)
        ball(matte(rnd.choice(tones), 1.0), (x, yy, height(FAR, x, yy, 0.0) + lift + r * tall * 0.45), (r, r, r * tall), seg=32)
        x += step * rnd.uniform(0.7, 1.2)

# ===================== FOREGROUND =====================
CURRENT = "fg"
HILL_DX = 2.4  # each stop's hill is centred a little right of its building
mids = [STOPS[0] + HILL_DX - 22] + [s + HILL_DX + 11 for s in STOPS]
for i, sx in enumerate(STOPS):
    hill(painted(f"main{i}", "#E9A3CB", "#F1B9D8"), (sx + HILL_DX, 2, -14), 15, "walk")
for i, mx in enumerate(mids):
    hill(painted(f"front{i}", "#DF93C0", "#E9A3CB"), (mx, -4, -9.6), 10.5, "walk")
x = -20.0
while x < FG_W + 25:
    hill(painted(f"base{x}", "#D684B6", "#DF93C0"), (x, -7, -30.6), 30.2)
    x += 16

for i, sx in enumerate(STOPS):
    tones = PURPLE_TREE if i % 2 == 0 else YELLOW_TREE
    other = YELLOW_TREE if i % 2 == 0 else PURPLE_TREE
    if i == 0:
        put("cabin", cabin_parts(), sx, 3.0, -22, 1.55, sink=0.45)
        put("dog", dog_parts(), sx + 4.3, 0.2, -32, 1.05)
        put("cat", cat_parts(), sx - 3.2, 0.4, 28, 0.95)
    elif i == 1:
        put("clinic", cabin_parts(sign=True), sx, 3.0, -22, 1.7, sink=0.5)
        put("dog", dog_parts(), sx - 3.3, 0.3, 26, 1.05)
        put("cat", cat_parts(), sx + 4.0, 0.3, -30, 0.95)
    elif i == 2:
        put("stall", stall_parts(), sx, 3.0, -18, 1.6, sink=0.4)
        put("dog", dog_parts(), sx + 4.4, 0.4, -34, 1.05)
        put("cat", cat_parts(), sx - 3.5, 0.2, 30, 0.95)
    else:
        put("cabin_a", cabin_parts(), sx, 3.0, -22, 1.5, sink=0.45)
        put("cabin_b", cabin_parts(), sx - 3.9, 3.0, -8, 0.95, sink=0.1)
        put("cabin_c", cabin_parts(), sx + 5.2, 3.8, -34, 1.1, sink=0.4)
        put("dog", dog_parts(), sx + 3.8, -0.8, -32, 1.05)
        put("dog2", dog_parts(body=WHITE, ear=PINK, belly=WHITE, collar=YELLOW), sx + 2.3, -1.8, -12, 0.85)
        put("cat", cat_parts(), sx - 1.5, -1.0, 28, 0.95)

    put("lamp", lamp_parts(), sx + 2.7, 2.4, 0, 1.0, sink=0.1)
    put("bench", bench_parts(), sx + 6.3, 1.0, -24, 1.0, sink=0.03)
    tree(sx + 8.6, 1.5, 3.4, 1.5, tones)
    tree(sx - 7.6, 2.0, 2.6, 1.25, other)
    tree(sx + 12.6, -3.5, 3.0, 1.35, other)       # on the hill between stops
    bush(sx + 2.3, -1.2, 0.34, other[1])
    bush(sx - 5.6, -1.6, 0.3, tones[1])
    bush(sx + 14.5, -4.5, 0.36, tones[1])
    fx = sx + 1.7                                  # picket fence behind the bench
    while fx < sx + 7.6:
        box(WHITE, (fx, 4.7, ground_z(fx, 4.7) + 0.3), (0.13, 0.07, 0.8))
        fx += 0.42
    for _ in range(46):                            # flowers
        px_, py_ = sx + rnd.uniform(-9, 13), rnd.uniform(-7.5, 1.5)
        pz = ground_z(px_, py_)
        if pz > -50:
            ball(rnd.choice((YELLOW, WHITE, PURPLE)), (px_, py_, pz + 0.05), rnd.uniform(0.06, 0.1), seg=12)

# ---------- light ----------
for name, direction, energy, col, angle in (("key", (-0.5, 0.55, -0.67), 2.5, (1.0, 0.97, 0.9), 12),
                                            ("rim", (0.5, -0.7, -0.3), 0.8, (1.0, 0.95, 0.97), 8)):
    sd = bpy.data.lights.new(name, "SUN")
    sd.energy = energy
    sd.color = col
    sd.angle = radians(angle)
    so = bpy.data.objects.new(name, sd)
    scene.collection.objects.link(so)
    from mathutils import Vector
    so.rotation_euler = Vector(direction).to_track_quat("-Z", "Y").to_euler()

world = bpy.data.worlds.new("world")
world.use_nodes = True
wbg = world.node_tree.nodes["Background"]
wbg.inputs["Color"].default_value = (0.95, 0.98, 1.0, 1)
wbg.inputs["Strength"].default_value = 0.45
scene.world = world

# ---------- camera & render ----------
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.type = "ORTHO"
cam.data.clip_end = 400
cam.rotation_euler = (radians(90), 0, 0)
scene.collection.objects.link(cam)
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
except Exception as e:
    print("GPU unavailable:", e)
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.quality = 86

for layer, width, transparent, mode in (("bg", BG_W, False, "RGB"), ("fg", FG_W, True, "RGBA")):
    for name, objs in LAYERS.items():
        for o in objs:
            o.visible_camera = name == layer
    cam.location = (width / 2, -60, CAM_Z)
    cam.data.ortho_scale = width
    scene.render.resolution_x = round(H_PX * width / VIEW_H)
    scene.render.resolution_y = H_PX
    scene.render.film_transparent = transparent
    scene.render.image_settings.color_mode = mode
    scene.render.filepath = os.path.join(OUT_DIR, f"park-{layer}.webp")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", scene.render.filepath, scene.render.resolution_x, "x", H_PX)
