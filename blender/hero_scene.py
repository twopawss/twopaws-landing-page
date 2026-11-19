"""TwoPaws "Clay Pet World" hero scene.

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/hero_scene.py -- <out.png> [samples] [width] [height]
"""
import bpy, bmesh, sys, os
from math import radians, cos, sin, pi
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "//hero.png"
SAMPLES = int(argv[1]) if len(argv) > 1 else 96
W = int(argv[2]) if len(argv) > 2 else 1600
H = int(argv[3]) if len(argv) > 3 else 1400
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREEN_IMG = os.path.join(ROOT, "client", "public", "home.png")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ---------- materials ----------
def lin(c):
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


def clay(name, hexcol, rough=0.8, bump=0.06):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexrgb(hexcol)
    b.inputs["Roughness"].default_value = rough
    try:
        b.inputs["Subsurface Weight"].default_value = 0.15
        b.inputs["Subsurface Radius"].default_value = (0.3, 0.2, 0.2)
        b.inputs["Subsurface Scale"].default_value = 0.2
    except KeyError:
        pass
    if bump:
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 35
        noise.inputs["Detail"].default_value = 4
        bn = nt.nodes.new("ShaderNodeBump")
        bn.inputs["Strength"].default_value = bump
        nt.links.new(noise.outputs["Fac"], bn.inputs["Height"])
        nt.links.new(bn.outputs["Normal"], b.inputs["Normal"])
    return m


PURPLE = clay("purple", "#783F6A")
PURPLE_D = clay("purple_dark", "#4A2441")
YELLOW = clay("yellow", "#FEC329")
ORANGE = clay("orange", "#E79A12")
PINK = clay("pink", "#DF93C0")
LILAC = clay("lilac", "#E9B9D7")
CREAM = clay("cream", "#FFF4DC")
WHITE = clay("white", "#FFFDF8")
DARK = clay("dark", "#2A1626", rough=0.35, bump=0)


# ---------- helpers ----------
def finish(obj, mat, smooth=True):
    obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def ball(mat, loc, scale=(1, 1, 1), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=loc,
                                         rotation=[radians(a) for a in rot])
    o = bpy.context.object
    o.scale = scale if isinstance(scale, tuple) else (scale,) * 3
    return finish(o, mat)


def cyl(mat, loc, r, depth, rot=(0, 0, 0), bevel=0.0, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=r, depth=depth, location=loc,
                                            rotation=[radians(a) for a in rot])
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=r, radius2=r2, depth=depth, location=loc,
                                        rotation=[radians(a) for a in rot])
    o = bpy.context.object
    finish(o, mat)
    if bevel:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 8
        mod.limit_method = "ANGLE"
        mod.angle_limit = radians(40)
    return o


def torus(mat, loc, R, r, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=64, minor_segments=20,
                                     location=loc, rotation=[radians(a) for a in rot])
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
    return o


def group(name, objs, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    for o in objs:
        o.parent = e
    e.location = loc
    e.rotation_euler = [radians(a) for a in rot]
    e.scale = (scale,) * 3
    return e


def bone(mat, length=0.9, r=0.11):
    parts = [cyl(mat, (0, 0, 0), r, length, rot=(0, 90, 0))]
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(ball(mat, (sx * length / 2, sy * r * 0.95, 0), r * 1.45))
    return parts


def rounded_slab(mat, w, h, radius, depth):
    """Rounded rectangle in the XZ plane, extruded along Y."""
    me = bpy.data.meshes.new("slab")
    bm = bmesh.new()
    verts = []
    corners = [(w / 2 - radius, h / 2 - radius, 0), (-w / 2 + radius, h / 2 - radius, 90),
               (-w / 2 + radius, -h / 2 + radius, 180), (w / 2 - radius, -h / 2 + radius, 270)]
    for cx, cz, a0 in corners:
        for i in range(17):
            a = radians(a0 + i * 90 / 16)
            verts.append(bm.verts.new((cx + radius * cos(a), 0, cz + radius * sin(a))))
    bm.faces.new(verts)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("slab", me)
    scene.collection.objects.link(o)
    so = o.modifiers.new("solid", "SOLIDIFY")
    so.thickness = depth
    so.offset = 0
    bv = o.modifiers.new("bevel", "BEVEL")
    bv.width = depth * 0.3
    bv.segments = 6
    bv.limit_method = "ANGLE"
    bv.angle_limit = radians(60)
    me.materials.append(mat)
    return o


# ---------- island ----------
cyl(LILAC, (0, 0, -0.3), 3.3, 0.6, bevel=0.25)
cyl(PURPLE, (0, 0, -1.3), 1.0, 1.7, r2=3.05, bevel=0.45)
for loc, s in (((-2.9, -0.6, -2.0), 0.28), ((2.6, 0.4, -2.3), 0.2), ((1.2, -1.0, -3.0), 0.14)):
    ball(PURPLE, loc, (s, s, s * 0.8))

# ---------- phone ----------
PW, PH = 1.62, 3.26
body = rounded_slab(DARK, PW, PH, 0.29, 0.17)
frame = rounded_slab(PURPLE, PW + 0.07, PH + 0.07, 0.32, 0.13)

smat = bpy.data.materials.new("screen")
smat.use_nodes = True
nt = smat.node_tree
bsdf = nt.nodes["Principled BSDF"]
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = bpy.data.images.load(SCREEN_IMG)
tex.extension = "EXTEND"
bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
bsdf.inputs["Emission Strength"].default_value = 0.95
bsdf.inputs["Roughness"].default_value = 0.25

bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.088, 0), rotation=(radians(90), 0, 0))
screen = bpy.context.object
screen.scale = (1.42, 3.06, 1)
screen.data.materials.append(smat)
U0, U1, V0, V1 = 0.122, 0.906, 0.041, 0.961  # screen area inside home.png
for loop in screen.data.uv_layers.active.data:
    loop.uv = (U0 + loop.uv[0] * (U1 - U0), V0 + loop.uv[1] * (V1 - V0))

group("phone", [body, frame, screen], loc=(0.1, 0.35, 1.72), rot=(-7, 0, -10))
ball(PURPLE, (0.1, 0.4, 0.0), (1.0, 0.45, 0.16))  # little mound the phone stands in

# ---------- dog ----------
dog = [
    ball(YELLOW, (0, 0, 0.62), (0.52, 0.48, 0.64)),             # torso
    ball(CREAM, (0, -0.26, 0.66), (0.3, 0.26, 0.4)),            # chest
    ball(YELLOW, (0, -0.1, 1.48), 0.46),                         # head
    ball(CREAM, (0, -0.47, 1.37), (0.25, 0.22, 0.19)),          # snout
    ball(DARK, (0, -0.68, 1.43), (0.085, 0.06, 0.06)),          # nose
    ball(PINK, (0, -0.6, 1.25), (0.07, 0.05, 0.09)),            # tongue
    ball(YELLOW, (0, 0.5, 0.45), (0.09, 0.09, 0.34), rot=(-40, 0, 0)),  # tail
    torus(PURPLE, (0, -0.06, 1.1), 0.33, 0.06),                  # collar
    ball(YELLOW, (0, -0.4, 1.02), 0.085),                        # tag
]
for s in (-1, 1):
    dog += [
        ball(DARK, (s * 0.18, -0.5, 1.6), 0.055),                              # eye
        ball(ORANGE, (s * 0.44, -0.08, 1.42), (0.13, 0.17, 0.32), rot=(0, s * -12, 0)),  # ear
        ball(YELLOW, (s * 0.22, -0.36, 0.36), (0.13, 0.13, 0.4)),              # front leg
        ball(CREAM, (s * 0.22, -0.48, 0.09), (0.16, 0.2, 0.1)),                # front paw
        ball(YELLOW, (s * 0.44, -0.08, 0.27), (0.27, 0.34, 0.27)),             # haunch
        ball(CREAM, (s * 0.52, -0.4, 0.09), (0.15, 0.2, 0.1)),                 # back paw
    ]
group("dog", dog, loc=(-1.75, -0.75, 0), rot=(0, 0, 24), scale=1.0)

# ---------- cat ----------
cat = [
    ball(WHITE, (0, 0, 0.5), (0.38, 0.36, 0.52)),               # torso
    ball(WHITE, (0, -0.06, 1.18), (0.43, 0.37, 0.37)),          # head
    ball(PINK, (0, -0.42, 1.13), (0.045, 0.035, 0.03)),         # nose
    torus(YELLOW, (0, -0.03, 0.88), 0.25, 0.05),                 # collar
    ball(PURPLE, (0, -0.3, 0.82), 0.07),                         # tag
    tube(WHITE, [(0.2, 0.25, 0.15), (0.6, 0.45, 0.1), (0.85, 0.3, 0.45), (0.75, 0.2, 0.9), (0.55, 0.2, 1.05)], 0.075),
]
for s in (-1, 1):
    ear = cyl(WHITE, (s * 0.25, -0.03, 1.52), 0.17, 0.3, r2=0.02, rot=(0, s * 14, 0))
    inner = cyl(PINK, (s * 0.25, -0.075, 1.5), 0.1, 0.2, r2=0.01, rot=(0, s * 14, 0))
    cat += [
        ear, inner,
        ball(DARK, (s * 0.16, -0.39, 1.24), (0.05, 0.04, 0.065)),              # eye
        ball(WHITE, (s * 0.07, -0.38, 1.08), (0.09, 0.07, 0.065)),             # muzzle
        ball(WHITE, (s * 0.14, -0.27, 0.28), (0.095, 0.095, 0.3)),             # front leg
        ball(WHITE, (s * 0.14, -0.35, 0.07), (0.115, 0.15, 0.075)),            # front paw
        ball(WHITE, (s * 0.3, -0.05, 0.2), (0.2, 0.26, 0.2)),                  # haunch
    ]
group("cat", cat, loc=(1.85, -0.7, 0), rot=(0, 0, -24), scale=1.0)

# ---------- props ----------
# paw coin
coin = [cyl(PURPLE, (0, 0, 0), 0.72, 0.2, rot=(90, 0, 0), bevel=0.07),
        ball(YELLOW, (0, -0.1, -0.16), (0.3, 0.08, 0.25))]
for x, z, r in ((-0.38, 0.12, 0.12), (-0.14, 0.33, 0.135), (0.14, 0.33, 0.135), (0.38, 0.12, 0.12)):
    coin.append(ball(YELLOW, (x, -0.1, z), (r, 0.07, r * 1.2)))
group("coin", coin, loc=(-2.0, 1.2, 2.95), rot=(8, -12, 18))

group("bone_float", bone(CREAM), loc=(2.2, 1.0, 3.1), rot=(15, 30, 10), scale=1.1)
group("bone_ground", bone(CREAM), loc=(-0.2, -2.2, 0.11), rot=(0, 0, 25), scale=0.75)

# bowl with kibble
bowl = [cyl(PINK, (0, 0, 0.16), 0.5, 0.32, r2=0.4, bevel=0.05),
        ball(ORANGE, (0, 0, 0.3), (0.34, 0.34, 0.1))]
for i in range(7):
    a = i * 2 * pi / 7
    bowl.append(ball(YELLOW, (0.17 * cos(a), 0.17 * sin(a), 0.38), 0.07))
bowl.append(ball(YELLOW, (0, 0, 0.42), 0.075))
group("bowl", bowl, loc=(0.95, -1.9, 0), scale=0.9)

ball(YELLOW, (2.55, 0.75, 0.27), 0.27)           # ball
ball(PINK, (-2.7, 0.5, 0.2), 0.2)
# floating confetti blobs
for loc, s, m in (((-3.3, 0.0, 1.7), 0.13, YELLOW), ((3.3, -0.2, 1.9), 0.11, PINK),
                  ((0.9, 1.5, 4.0), 0.12, YELLOW), ((-0.9, 1.4, 3.9), 0.09, PINK),
                  ((3.0, 0.8, 2.6), 0.08, PURPLE), ((-3.1, 0.9, 2.3), 0.08, PURPLE)):
    ball(m, loc, s)

# ---------- camera & light ----------
target = bpy.data.objects.new("target", None)
target.location = (0, 0, 0.75)
scene.collection.objects.link(target)


def aim(o):
    c = o.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"


cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = 62
cam.location = (0, -14.5, 4.6)
scene.collection.objects.link(cam)
aim(cam)
scene.camera = cam

for name, loc, size, power, col in (("key", (-5, -7, 9), 7, 820, (1, 0.97, 0.92)),
                                    ("fill", (7, -6, 3), 6, 230, (1, 0.9, 0.97)),
                                    ("rim", (2, 7, 6), 5, 480, (1, 0.92, 0.8))):
    ld = bpy.data.lights.new(name, "AREA")
    ld.size = size
    ld.energy = power
    ld.color = col
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    scene.collection.objects.link(lo)
    aim(lo)

world = bpy.data.worlds.new("world")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (1, 0.95, 0.97, 1)
bg.inputs["Strength"].default_value = 0.3
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
except Exception as e:  # falls back to CPU
    print("GPU unavailable:", e)
scene.render.film_transparent = True
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "WEBP" if OUT.endswith(".webp") else "PNG"
scene.render.image_settings.quality = 88
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("RENDERED", OUT)
