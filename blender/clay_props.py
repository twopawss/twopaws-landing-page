"""Small clay props used as decoration on the light sections of the site.

Renders each prop on a transparent background:
  <out_dir>/prop-paw.webp, prop-bone.webp, prop-ball.webp, prop-bowl.webp

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/clay_props.py -- <out_dir> [samples] [size_px]
"""
import bpy, sys, os
from math import radians, cos, sin, pi

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_DIR = argv[0] if argv else "//"
SAMPLES = int(argv[1]) if len(argv) > 1 else 96
SIZE = int(argv[2]) if len(argv) > 2 else 640

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def lin(c):
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


def clay(hexcol):
    """Matte clay with a faint hand-made surface."""
    m = bpy.data.materials.new(hexcol)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexrgb(hexcol)
    b.inputs["Roughness"].default_value = 0.8
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 30
    noise.inputs["Detail"].default_value = 4
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.07
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


PURPLE, YELLOW, PINK, WHITE, ORANGE = clay("#783F6A"), clay("#FEC329"), clay("#DF93C0"), clay("#FFFFFF"), clay("#E79A12")


def finish(o, mat):
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def ball(mat, loc, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, location=loc)
    o = bpy.context.object
    o.scale = scale if isinstance(scale, tuple) else (scale,) * 3
    return finish(o, mat)


def cyl(mat, loc, r, depth, rot=(0, 0, 0), r2=None, bevel=0.0):
    kw = dict(vertices=96, depth=depth, location=loc, rotation=[radians(a) for a in rot])
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, **kw)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, **kw)
    o = finish(bpy.context.object, mat)
    if bevel:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 8
        mod.limit_method = "ANGLE"
        mod.angle_limit = radians(40)
    return o


def torus(mat, loc, R, r, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=96, minor_segments=24,
                                     location=loc, rotation=[radians(a) for a in rot])
    return finish(bpy.context.object, mat)


def group(name, objs, rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    for o in objs:
        o.parent = e
    e.rotation_euler = [radians(a) for a in rot]
    return e, objs


PROPS = {}

# paw coin
parts = [cyl(PURPLE, (0, 0, 0), 1.0, 0.3, rot=(90, 0, 0), bevel=0.1), ball(YELLOW, (0, -0.15, -0.22), (0.42, 0.11, 0.35))]
for x, z, r in ((-0.53, 0.17, 0.17), (-0.2, 0.46, 0.19), (0.2, 0.46, 0.19), (0.53, 0.17, 0.17)):
    parts.append(ball(YELLOW, (x, -0.15, z), (r, 0.1, r * 1.2)))
PROPS["paw"] = group("paw", parts, rot=(10, -14, 12))

# bone
L, R = 1.5, 0.19
parts = [cyl(PINK, (0, 0, 0), R, L, rot=(0, 90, 0))]
for sx in (-1, 1):
    for sz in (-1, 1):
        parts.append(ball(PINK, (sx * L / 2, 0, sz * R * 0.95), R * 1.5))
PROPS["bone"] = group("bone", parts, rot=(0, -28, 0))

# ball with a stripe
PROPS["ball"] = group("ball", [ball(YELLOW, (0, 0, 0), 0.9), torus(PURPLE, (0, 0, 0), 0.86, 0.085, rot=(22, 14, 0))])

# food bowl
parts = [cyl(PURPLE, (0, 0, 0), 1.0, 0.6, r2=0.82, bevel=0.09), ball(ORANGE, (0, 0, 0.27), (0.7, 0.7, 0.16))]
for i in range(8):
    a = i * 2 * pi / 8
    parts.append(ball(YELLOW, (0.36 * cos(a), 0.36 * sin(a), 0.42), 0.13))
parts.append(ball(YELLOW, (0, 0, 0.5), 0.14))
PROPS["bowl"] = group("bowl", parts)

# camera and soft studio light
target = bpy.data.objects.new("target", None)
scene.collection.objects.link(target)


def aim(o):
    c = o.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"


cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = 85
cam.location = (0, -9.5, 2.6)
scene.collection.objects.link(cam)
aim(cam)
scene.camera = cam

for name, loc, size, power in (("key", (-4, -5, 6), 6, 700), ("fill", (5, -4, 2), 5, 200), ("rim", (1, 5, 4), 4, 350)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.size = size
    ld.energy = power
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    scene.collection.objects.link(lo)
    aim(lo)

world = bpy.data.worlds.new("world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 0.96, 0.98, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
scene.world = world

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
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.quality = 88

for name in PROPS:
    for other, (_, objs) in PROPS.items():
        for o in objs:
            o.hide_render = other != name
    scene.render.filepath = os.path.join(OUT_DIR, f"prop-{name}.webp")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", scene.render.filepath)
