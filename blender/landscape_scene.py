"""TwoPaws full-bleed landscape scenes, each rendered as two layers for parallax.

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/landscape_scene.py -- <out_dir> <variant> [samples] [width] [height]
Bright daylight park scenes in the app colours. Variants: home (cabin), care (vet clinic), shop (market stall), stay (pet hotel).
Writes <out_dir>/scene-<variant>-bg.webp (opaque) and <out_dir>/scene-<variant>-fg.webp (transparent).
"""
import bpy, bmesh, sys, os
from math import radians, cos, sin, sqrt

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_DIR = argv[0] if argv else "//"
VARIANT = argv[1] if len(argv) > 1 else "home"
SAMPLES = int(argv[2]) if len(argv) > 2 else 128
W = int(argv[3]) if len(argv) > 3 else 2400
H = int(argv[4]) if len(argv) > 4 else 1350

# Bright daylight palettes built from the app colours: blue sky, pink #DF93C0, yellow #FEC329, purple #783F6A, white.
SKY = ("#EAF6FF", "#BDE2FA", "#7CC4F2")  # horizon, middle, top
FAR = dict(floor="#E5A3CA", far_l=("#DF93C0", "#E5A3CA"), far_r=("#D988B8", "#DF93C0"))
DAY = dict(FAR, sky=SKY, fog="#FFFFFF", world=((0.95, 0.98, 1.0), 0.45), key=(2.5, (1.0, 0.97, 0.9)),
           rim=(0.8, (1.0, 0.95, 0.97)), stars=False, lamp=0, glow=0)
LILAC_TREES = ("#D9B8D2", "#CDA5C5", "#B88BB0", "#A8779F", "#93508A")
YELLOW_TREES = ("#FFE06A", "#FFD84F", "#FEC329", "#F9B91A", "#EFA70F")
VARIANTS = {
    "home": dict(
        DAY, mtn=LILAC_TREES, main=("#E9A3CB", "#F1B9D8"), front=("#DF93C0", "#E9A3CB"), base=("#D684B6", "#DF93C0"),
        trees=("#783F6A", "#93508A", "#B06AA4"), bush="#93508A", orb=((13, 90, 29.5), 2.2, 3.0)),
    "care": dict(
        DAY, mtn=YELLOW_TREES, main=("#C48FBA", "#D3A6CB"), front=("#B57DAB", "#C48FBA"), base=("#A66C9C", "#B57DAB"),
        trees=("#F9B91A", "#FEC329", "#FFD768"), bush="#FEC329", orb=((16, 90, 28), 2.2, 3.0)),
    "shop": dict(
        DAY, mtn=LILAC_TREES, main=("#F1B9D8", "#F6CFE4"), front=("#E9A3CB", "#F1B9D8"), base=("#DF93C0", "#E9A3CB"),
        trees=("#F9B91A", "#FEC329", "#FFD768"), bush="#FEC329", orb=((-16, 90, 22), 2.6, 3.0)),
    "stay": dict(
        DAY, mtn=YELLOW_TREES, main=("#DF93C0", "#E9A3CB"), front=("#D07AAE", "#DF93C0"), base=("#C06A9E", "#D07AAE"),
        trees=("#783F6A", "#93508A", "#B06AA4"), bush="#93508A", orb=((9, 90, 30), 2.0, 3.0)),
}
V = VARIANTS[VARIANT]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

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


def matte(name, hexcol, rough=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexrgb(hexcol)
    b.inputs["Roughness"].default_value = rough
    return m


def painted(name, hex_a, hex_b, scale=0.35, stretch=(1, 1, 1)):
    """Two tones mixed by soft noise, for a brushed, illustrated surface."""
    m = matte(name, hex_a)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
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


def glow(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*rgb, 1)
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
    return m


YELLOW = matte("yellow", "#FEC329", 0.8)
ORANGE = matte("orange", "#E79A12", 0.8)
PINK = matte("pink", "#DF93C0", 0.8)
CREAM = matte("cream", "#FFFFFF", 0.8)  # was beige; now white
WHITE = matte("white", "#FFFDF8", 0.8)
PURPLE = matte("purple", "#783F6A", 0.8)
DARK = matte("dark", "#2A1626", 0.4)
WALL = matte("wall", "#FFFFFF")
ROOF = matte("roof", "#783F6A")
TRUNK = matte("trunk", "#5E3256")
# in daylight, doors and windows are plain purple instead of glowing
GLOW = glow("glow", (1.0, 0.56, 0.12), V["glow"]) if V["glow"] else matte("door", "#783F6A", 0.6)


# ---------- helpers ----------
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


def cyl(mat, loc, r, depth, rot=(0, 0, 0), r2=None, verts=64, smooth=True):
    kw = dict(vertices=verts, depth=depth, location=loc, rotation=[radians(a) for a in rot])
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, **kw)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, **kw)
    return finish(bpy.context.object, mat, smooth)


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


def group(name, objs, loc=(0, 0, 0), rot_z=0.0, scale=1.0):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    for o in objs:
        o.parent = e
    e.location = loc
    e.rotation_euler = (0, 0, radians(rot_z))
    e.scale = (scale,) * 3
    return e


# ---------- terrain ----------
HILLS = []  # (cx, cy, cz, r) for the walkable foreground hills


FAR_HILLS = []  # background hills, for placing the distant treeline


def hill(mat, c, r, walk=False):
    o = ball(mat, c, r, seg=128)
    (HILLS if walk else FAR_HILLS).append((*c, r))
    return o


def far_z(x, y):
    best = -0.6  # valley floor
    for cx, cy, cz, r in FAR_HILLS:
        d2 = (x - cx) ** 2 + (y - cy) ** 2
        if d2 < r * r:
            best = max(best, cz + sqrt(r * r - d2))
    return best


def ground_z(x, y):
    best = -99
    for cx, cy, cz, r in HILLS:
        d2 = (x - cx) ** 2 + (y - cy) ** 2
        if d2 < r * r:
            best = max(best, cz + sqrt(r * r - d2))
    return best


# ===== background layer =====
CURRENT = "bg"

# sky backdrop with a vertical dusk gradient
sky = bpy.data.materials.new("sky")
sky.use_nodes = True
nt = sky.node_tree
nt.nodes.remove(nt.nodes["Principled BSDF"])
tc = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
els = ramp.color_ramp.elements
els[0].position, els[0].color = 0.30, hexrgb(V["sky"][0])
els[1].position, els[1].color = 0.80, hexrgb(V["sky"][2])
mid = els.new(0.47)
mid.color = hexrgb(V["sky"][1])
em = nt.nodes.new("ShaderNodeEmission")
nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
nt.links.new(em.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 95, 25), rotation=(radians(90), 0, 0))
bd = bpy.context.object
bd.scale = (300, 120, 1)
bd.data.materials.append(sky)
bd.visible_shadow = False
reg(bd)

if V["orb"]:
    ball(glow("orb", (1.0, 0.86, 0.45), V["orb"][2]), V["orb"][0], V["orb"][1])
if V["stars"]:
    import random
    star_rnd = random.Random(7)
    star = glow("star", (1.0, 0.95, 0.9), 2.5)
    for _ in range(70):
        ball(star, (star_rnd.uniform(-75, 75), 89, star_rnd.uniform(15, 42)), star_rnd.uniform(0.07, 0.16), seg=12)

def fog_card(y, z, w, h, strength, seed):
    m = bpy.data.materials.new("fog")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Location"].default_value = (seed * 7.3, seed * 3.1, 0)
    mp.inputs["Scale"].default_value = (2.0, 1.0, 1)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.3
    noise.inputs["Detail"].default_value = 7
    noise.inputs["Roughness"].default_value = 0.62
    nr = nt.nodes.new("ShaderNodeValToRGB")
    nr.color_ramp.elements[0].position = 0.36
    nr.color_ramp.elements[1].position = 0.8
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    vr = nt.nodes.new("ShaderNodeValToRGB")  # fade out at top and bottom
    vr.color_ramp.elements[0].position, vr.color_ramp.elements[0].color = 0.0, (0, 0, 0, 1)
    vr.color_ramp.elements[1].position, vr.color_ramp.elements[1].color = 1.0, (0, 0, 0, 1)
    c = vr.color_ramp.elements.new(0.45)
    c.color = (1, 1, 1, 1)
    hr = nt.nodes.new("ShaderNodeValToRGB")  # fade out at left and right
    hr.color_ramp.elements[0].position, hr.color_ramp.elements[0].color = 0.0, (0, 0, 0, 1)
    hr.color_ramp.elements[1].position, hr.color_ramp.elements[1].color = 1.0, (0, 0, 0, 1)
    c2 = hr.color_ramp.elements.new(0.5)
    c2.color = (1, 1, 1, 1)
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul2 = nt.nodes.new("ShaderNodeMath")
    mul2.operation = "MULTIPLY"
    mul3 = nt.nodes.new("ShaderNodeMath")
    mul3.operation = "MULTIPLY"
    mul3.inputs[1].default_value = strength
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = hexrgb(V["fog"])
    em.inputs["Strength"].default_value = 1.0
    mix = nt.nodes.new("ShaderNodeMixShader")
    L = nt.links.new
    L(tc.outputs["Generated"], mp.inputs["Vector"])
    L(mp.outputs["Vector"], noise.inputs["Vector"])
    L(noise.outputs["Fac"], nr.inputs["Fac"])
    L(tc.outputs["Generated"], sep.inputs["Vector"])
    L(sep.outputs["Y"], vr.inputs["Fac"])
    L(sep.outputs["X"], hr.inputs["Fac"])
    L(nr.outputs["Color"], mul.inputs[0])
    L(vr.outputs["Color"], mul.inputs[1])
    L(mul.outputs[0], mul2.inputs[0])
    L(hr.outputs["Color"], mul2.inputs[1])
    L(mul2.outputs[0], mul3.inputs[0])
    L(mul3.outputs[0], mix.inputs["Fac"])
    L(tr.outputs["BSDF"], mix.inputs[1])
    L(em.outputs["Emission"], mix.inputs[2])
    L(mix.outputs["Shader"], nt.nodes["Material Output"].inputs["Surface"])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, y, z), rotation=(radians(90), 0, 0))
    o = bpy.context.object
    o.scale = (w, h, 1)
    o.data.materials.append(m)
    o.visible_shadow = False
    return reg(o)


fog_card(60, 9, 150, 22, 0.75, 1)
fog_card(50, 6, 130, 18, 0.85, 2)
fog_card(40, 4.5, 110, 13, 0.9, 3)
fog_card(30, 3.2, 90, 8, 0.7, 4)

# hazy valley floor so nothing behind the hills is empty
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 40, -0.6))
floor = bpy.context.object
floor.scale = (400, 160, 1)
finish(floor, matte("floor", V["floor"], 1.0))

hill(painted("hill_far_l", *V["far_l"], 0.12), (-10, 20, -22.5), 25)
hill(painted("hill_far_r", *V["far_r"], 0.12), (20, 16, -19), 21.5)

# distant park treeline: rows of round canopies, hazier with distance
import random
rnd = random.Random(11)
for row, (y, r_lo, r_hi, step, tone) in enumerate(((31, 1.9, 3.0, 3.6, 3), (43, 2.8, 4.2, 5.0, 2), (57, 3.8, 5.6, 6.5, 0))):
    canopy = matte(f"canopy{row}", V["mtn"][tone], 1.0)
    x = -62 + rnd.uniform(0, step)
    while x < 62:
        r = rnd.uniform(r_lo, r_hi)
        tall = rnd.choice((1.0, 1.0, 1.25, 1.6))
        yy = y + rnd.uniform(-2.5, 2.5)
        ball(canopy, (x, yy, far_z(x, yy) + r * tall * 0.55), (r, r, r * tall), seg=32)
        x += step * rnd.uniform(0.7, 1.25)

# soft clouds
cloud = matte("cloud", V["fog"], 1.0)
for cx, cz, s_ in ((-34, 27, 1.5), (-6, 33, 1.0), (30, 24, 1.3), (48, 31, 0.9)):
    for dx, dz, r in ((0, 0, 2.6), (2.8, -0.3, 2.0), (-2.9, -0.4, 1.9), (5.2, -0.8, 1.3), (-5.0, -0.9, 1.2)):
        c = ball(cloud, (cx + dx * s_, 84, cz + dz * s_), (r * s_ * 1.25, r * s_, r * s_ * 0.62), seg=32)
        c.visible_shadow = False

# ===== foreground layer =====
CURRENT = "fg"
hill(painted("hill_main", *V["main"], 0.3, (0.35, 1, 1)), (5, 2, -14), 15, walk=True)
hill(painted("hill_front", *V["front"], 0.3, (0.35, 1, 1)), (-10, -4, -9.6), 10.5, walk=True)
hill(painted("hill_base", *V["base"], 0.3, (0.35, 1, 1)), (0, -6, -30), 30.2)  # fills the gap at the bottom edge
hill(painted("hill_base_r", *V["base"], 0.3, (0.35, 1, 1)), (15, -8, -30), 30.2)

def cabin_parts(sign=False):
    parts = [
        box(WALL, (0, 0, 0.75), (2.4, 2.0, 1.5)),
        prism(WALL, 1.2, 1.5, 2.7, 1.0),
        box(ROOF, (0.767, 0, 2.017), (2.05, 2.5, 0.12), rot=(0, 45, 0)),
        box(ROOF, (-0.767, 0, 2.017), (2.05, 2.5, 0.12), rot=(0, -45, 0)),
        box(GLOW, (0, -1.0, 0.4), (0.8, 0.06, 0.8)),                    # door
        cyl(GLOW, (0, -1.0, 0.8), 0.4, 0.06, rot=(90, 0, 0)),           # door arch
        box(GLOW, (1.2, 0.0, 0.85), (0.06, 0.9, 0.5)),                  # side window
        box(CREAM, (0, -1.25, 0.03), (1.2, 0.5, 0.08)),                 # doorstep
    ]
    if sign:  # clinic: cream disc with a glowing cross
        parts += [cyl(CREAM, (0, -1.02, 1.95), 0.4, 0.06, rot=(90, 0, 0)),
                  box(GLOW, (0, -1.07, 1.95), (0.5, 0.05, 0.15)),
                  box(GLOW, (0, -1.07, 1.95), (0.15, 0.05, 0.5))]
    else:
        parts.append(cyl(GLOW, (0, -1.0, 1.95), 0.26, 0.06, rot=(90, 0, 0)))  # gable window
    return parts


def stall_parts():
    parts = [box(PURPLE, (0, 0, 0.42), (2.7, 1.0, 0.84)), box(CREAM, (0, 0, 0.88), (2.9, 1.2, 0.1))]
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(box(WALL, (sx * 1.3, sy * 0.45, 1.25), (0.09, 0.09, 2.5)))
    for i in range(8):  # striped awning
        x = -1.4 + i * 0.4
        parts.append(box(YELLOW if i % 2 == 0 else CREAM, (x, -0.15, 2.55), (0.4, 1.9, 0.08), rot=(16, 0, 0)))
    parts.append(box(ROOF, (-0.8, 0.05, 1.08), (0.8, 0.6, 0.3)))        # crate
    for i, (dx, dy, m) in enumerate(((-1.0, -0.05, ORANGE), (-0.75, 0.15, YELLOW), (-0.6, -0.08, PINK), (-0.95, 0.2, PINK))):
        parts.append(ball(m, (dx, dy, 1.27), 0.13))
    parts += [box(CREAM, (0.9, 0.1, 1.2), (0.42, 0.3, 0.55)),          # food bag
              box(YELLOW, (0.9, -0.06, 1.25), (0.26, 0.02, 0.2)),
              ball(GLOW, (0, -0.75, 2.05), 0.13),                        # lantern
              cyl(WALL, (0, -0.75, 2.3), 0.015, 0.4)]
    return parts


def dog_parts(body=YELLOW, ear=ORANGE, belly=CREAM, collar=PURPLE):
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


def cat_parts():
    cat = [
        ball(WHITE, (0, 0, 0.5), (0.38, 0.36, 0.52)),
        ball(WHITE, (0, -0.06, 1.18), (0.43, 0.37, 0.37)),
        ball(PINK, (0, -0.42, 1.13), (0.045, 0.035, 0.03)),
        torus(YELLOW, (0, -0.03, 0.88), 0.25, 0.05),
        tube(WHITE, [(0.2, 0.25, 0.15), (0.6, 0.45, 0.1), (0.85, 0.3, 0.45), (0.75, 0.2, 0.9), (0.55, 0.2, 1.05)], 0.075),
    ]
    for s in (-1, 1):
        cat += [
            cyl(WHITE, (s * 0.25, -0.03, 1.52), 0.17, 0.3, r2=0.02, rot=(0, s * 14, 0)),
            cyl(PINK, (s * 0.25, -0.075, 1.5), 0.1, 0.2, r2=0.01, rot=(0, s * 14, 0)),
            ball(DARK, (s * 0.16, -0.39, 1.24), (0.05, 0.04, 0.065)),
            ball(WHITE, (s * 0.07, -0.38, 1.08), (0.09, 0.07, 0.065)),
            ball(WHITE, (s * 0.14, -0.27, 0.28), (0.095, 0.095, 0.3)),
            ball(WHITE, (s * 0.14, -0.35, 0.07), (0.115, 0.15, 0.075)),
            ball(WHITE, (s * 0.3, -0.05, 0.2), (0.2, 0.26, 0.2)),
        ]
    return cat


def put(name, parts, x, y, rot_z, scale, sink=0.05, lift=0.0):
    return group(name, parts, loc=(x, y, ground_z(x, y) - sink + lift), rot_z=rot_z, scale=scale)


def door_light(x, y, z, energy):
    if not energy:
        return
    lamp = bpy.data.lights.new("door_light", "POINT")
    lamp.energy = energy
    lamp.color = (1.0, 0.6, 0.2)
    lamp.shadow_soft_size = 0.6
    lo = bpy.data.objects.new("door_light", lamp)
    lo.location = (x, y, z)
    scene.collection.objects.link(lo)


CX, CY = 2.6, 3.0
GZ = ground_z(CX, CY)
if VARIANT == "home":
    put("cabin", cabin_parts(), CX, CY, -22, 1.55, sink=0.45)
    door_light(CX - 0.9, CY - 2.4, GZ + 0.9, V["lamp"])
    put("dog", dog_parts(), 6.9, 0.2, -32, 1.05)
    put("cat", cat_parts(), -0.6, 0.4, 28, 0.95)
elif VARIANT == "care":
    put("clinic", cabin_parts(sign=True), CX, CY, -22, 1.7, sink=0.5)
    door_light(CX - 0.9, CY - 2.5, GZ + 0.9, V["lamp"])
    put("dog", dog_parts(), -0.7, 0.3, 26, 1.05)
    put("cat", cat_parts(), 6.6, 0.3, -30, 0.95)
elif VARIANT == "shop":
    put("stall", stall_parts(), CX, CY, -18, 1.6, sink=0.4)
    door_light(CX - 0.4, CY - 2.0, GZ + 2.6, V["lamp"])
    put("dog", dog_parts(), 7.0, 0.4, -34, 1.05)
    put("cat", cat_parts(), -0.9, 0.2, 30, 0.95)
elif VARIANT == "stay":
    put("cabin_a", cabin_parts(), CX, CY, -22, 1.5, sink=0.45)
    put("cabin_b", cabin_parts(), -2.6, 2.4, -8, 1.0, sink=0.0)
    put("cabin_c", cabin_parts(), 7.8, 3.8, -34, 1.1, sink=0.4)
    door_light(CX - 0.9, CY - 2.4, GZ + 0.9, V["lamp"])
    put("dog", dog_parts(), 6.4, -0.8, -32, 1.05)
    put("dog2", dog_parts(body=CREAM, ear=PINK, belly=WHITE, collar=YELLOW), 4.9, -1.8, -12, 0.85)
    put("cat", cat_parts(), 0.4, -0.6, 28, 0.95)


# ---------- park furniture ----------
def bench_parts():
    wood = matte("bench_wood", "#FFFFFF", 0.8)
    parts = [box(wood, (0, 0, 0.45), (1.7, 0.5, 0.08)), box(wood, (0, 0.27, 0.85), (1.7, 0.08, 0.42), rot=(-10, 0, 0))]
    for sx in (-0.7, 0.7):
        parts += [box(WALL, (sx, -0.17, 0.22), (0.08, 0.08, 0.44)), box(WALL, (sx, 0.24, 0.5), (0.08, 0.08, 1.0))]
    return parts


def lamp_parts():
    return [cyl(WALL, (0, 0, 1.45), 0.06, 2.9), cyl(WALL, (0, 0, 0.08), 0.18, 0.16),
            ball(GLOW, (0, 0, 3.0), 0.24), cyl(WALL, (0, 0, 3.27), 0.2, 0.1, r2=0.05)]


put("bench", bench_parts(), 8.8, 1.0, -24, 1.0, sink=0.03)
LX, LY = 5.3, 2.4
put("lamp", lamp_parts(), LX, LY, 0, 1.0, sink=0.1)
post_light = bpy.data.lights.new("post_light", "POINT")
post_light.energy = V["lamp"] * 0.35
post_light.color = (1.0, 0.62, 0.22)
post_light.shadow_soft_size = 0.3
plo = bpy.data.objects.new("post_light", post_light)
plo.location = (LX, LY - 0.4, ground_z(LX, LY) + 2.9)
scene.collection.objects.link(plo)

# picket fence along the back of the hill
x = 4.3
while x < 11.2:
    z = ground_z(x, 4.7)
    if z > -50:
        box(CREAM, (x, 4.7, z + 0.3), (0.13, 0.07, 0.8))
    x += 0.42

# stepping-stone path from the door towards the viewer
for sx, sy in ((1.9, 0.7), (1.5, -0.1), (1.3, -1.0), (1.4, -1.9), (1.8, -2.8), (2.4, -3.6)):
    ball(CREAM, (sx, sy, ground_z(sx, sy) + 0.01), (0.34, 0.26, 0.045), rot=(0, 0, rnd.uniform(0, 90)))

# scattered flowers
for _ in range(34):
    fx, fy = rnd.uniform(-3.5, 11.5), rnd.uniform(-4.5, 2.2)
    fz = ground_z(fx, fy)
    if fz > -50:
        ball(rnd.choice((YELLOW, WHITE, PURPLE)), (fx, fy, fz + 0.05), rnd.uniform(0.055, 0.09), seg=12)


def tree(x, y, height, crown, tones):
    z = ground_z(x, y) - 0.2
    cyl(TRUNK, (x, y, z + height / 2), 0.2, height, r2=0.12)
    for i, (dz, dx, s) in enumerate(((0.0, 0.0, 1.0), (crown * 0.75, 0.35, 0.78), (crown * 1.35, -0.1, 0.56))):
        ball(matte(f"leaf{x}{i}", tones[i % len(tones)], 0.95), (x + dx, y, z + height + dz), crown * s, seg=64)


tree(9.3, -3.5, 4.6, 1.9, V["trees"])
tree(10.6, 1.5, 3.4, 1.5, V["trees"])
for x, y, s in ((4.9, -1.2, 0.34), (5.4, -1.0, 0.24), (-7.5, -2.0, 0.36), (-6.9, -1.8, 0.24), (8.0, 2.2, 0.3)):
    ball(matte(f"bush{x}", V["bush"], 0.95), (x, y, ground_z(x, y) + s * 0.4), (s * 1.3, s, s))

# ---------- camera & light ----------
target = bpy.data.objects.new("target", None)
target.location = (0, 0, 4.4)
scene.collection.objects.link(target)


def aim(o, t=target):
    c = o.constraints.new("TRACK_TO")
    c.target = t
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"


cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = 40
cam.location = (0, -24, 3.0)
scene.collection.objects.link(cam)
aim(cam)
scene.camera = cam

origin = bpy.data.objects.new("origin", None)
scene.collection.objects.link(origin)
for name, loc, energy, col, angle in (("key", (-14, -12, 16), V["key"][0], V["key"][1], 12),
                                      ("rim", (16, 22, 9), V["rim"][0], V["rim"][1], 8)):
    sd = bpy.data.lights.new(name, "SUN")
    sd.energy = energy
    sd.color = col
    sd.angle = radians(angle)
    so = bpy.data.objects.new(name, sd)
    so.location = loc
    scene.collection.objects.link(so)
    aim(so, origin)

world = bpy.data.worlds.new("world")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (*V["world"][0], 1)
bg.inputs["Strength"].default_value = V["world"][1]
scene.world = world

# ---------- render ----------
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
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.quality = 86

for layer, transparent, mode in (("bg", False, "RGB"), ("fg", True, "RGBA")):
    for name, objs in LAYERS.items():
        for o in objs:
            o.visible_camera = name == layer
    scene.render.film_transparent = transparent
    scene.render.image_settings.color_mode = mode
    scene.render.filepath = os.path.join(OUT_DIR, f"scene-{VARIANT}-{layer}.webp")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", scene.render.filepath)
