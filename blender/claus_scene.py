"""TwoPaws Claus: a snowy, festive corner of the clay park, used as the hero of /claus.

Reuses the helpers and props from park_panorama.py (everything above its BACKGROUND section).
Writes <out_dir>/claus-hero.webp (opaque, 30 x 13 world units).

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/claus_scene.py -- <out_dir> [samples] [height_px]
"""
import os

_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "park_panorama.py")).read()
exec(compile(_src.split("# ===================== BACKGROUND")[0], "park_helpers", "exec"))

from math import radians, sin, cos  # noqa: E402
from mathutils import Vector  # noqa: E402

W = 30.0          # scene width in world units
SX = 20.0         # the cabin sits right of centre, leaving the left for the headline
RED = matte("#E5484D")
SNOW_A, SNOW_B = "#F3ECF8", "#FFFFFF"
PINES = ("#783F6A", "#93508A")
FAR_PINES = ("#C9A9CF", "#D9C0DD")

# ---------- sky ----------
sky = bpy.data.materials.new("sky")
sky.use_nodes = True
nt = sky.node_tree
nt.nodes.remove(nt.nodes["Principled BSDF"])
tc = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
els = ramp.color_ramp.elements
els[0].position, els[0].color = 0.36, hexrgb("#F2F8FF")
els[1].position, els[1].color = 0.88, hexrgb("#8CCBF3")
mid = els.new(0.58)
mid.color = hexrgb("#C8E6FA")
em = nt.nodes.new("ShaderNodeEmission")
nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
nt.links.new(em.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
bpy.ops.mesh.primitive_plane_add(size=1, location=(W / 2, 95, CAM_Z), rotation=(radians(90), 0, 0))
bd = bpy.context.object
bd.scale = (W + 40, 20, 1)
bd.data.materials.append(sky)
bd.visible_shadow = False

cloud = emit("cloud", (1.0, 1.0, 1.0), 1.0)
for cx, cz, s in ((4, 10.2, 0.42), (13, 9.3, 0.5), (26.5, 10.4, 0.4)):
    for dx, dz, r in ((0, 0, 2.6), (2.8, -0.4, 2.0), (-2.9, -0.5, 1.9), (5.2, -1.0, 1.3), (-5.0, -1.1, 1.2)):
        c = ball(cloud, (cx + dx * s, 84, cz + dz * s), (r * s * 1.25, r * s, r * s * 0.6), seg=32)
        c.visible_shadow = False


def pine(x, y, z0, h, r, tones, snow=True):
    """A clay Christmas tree: stacked cones with a little snow on each tier."""
    tiers = ((1.0, 0.0), (0.78, 0.26), (0.56, 0.5), (0.34, 0.72))
    for i, (k, t) in enumerate(tiers):
        tier_h = h * 0.42
        zc = z0 + h * t + tier_h / 2
        cyl(matte(tones[i % len(tones)], 0.95), (x, y, zc), r * k, tier_h, r2=r * k * 0.08)
        if snow:
            ball(WHITE, (x + r * k * 0.25, y - r * k * 0.5, zc - tier_h * 0.22), (r * k * 0.5, r * k * 0.3, tier_h * 0.1), seg=24)
            ball(WHITE, (x - r * k * 0.4, y - r * k * 0.42, zc - tier_h * 0.3), (r * k * 0.38, r * k * 0.26, tier_h * 0.09), seg=24)
    return z0 + h * 0.72 + h * 0.42  # tip height


# ---------- far snowy hills and distant pines ----------
x, i = -10.0, 0
while x < W + 14:
    r = rnd.uniform(15, 20)
    top = rnd.uniform(2.2, 3.4)
    hill(painted(f"far{i}", "#E7DCF0" if i % 2 else "#EEE5F5", "#F8F3FB", 0.12, (1, 1, 1)), (x, 18 + (i % 2) * 3, top - r), r, "far")
    x += rnd.uniform(9, 13)
    i += 1
for y, h_lo, h_hi, step, lift in ((30, 2.6, 3.8, 2.4, 0.0), (44, 3.4, 4.8, 3.2, 0.9)):
    x = -4 + rnd.uniform(0, step)
    while x < W + 4:
        h = rnd.uniform(h_lo, h_hi)
        yy = y + rnd.uniform(-2, 2)
        pine(x, yy, height(FAR, x, yy, 0.0) + lift - 0.3, h, h * 0.34, FAR_PINES, snow=False)
        x += step * rnd.uniform(0.7, 1.3)

# ---------- snowy ground ----------
hill(painted("main", SNOW_A, SNOW_B), (SX + 2.4, 2, -14), 15, "walk")
hill(painted("left", "#EDE4F4", SNOW_B), (2.0, 3, -14.4), 15, "walk")
for i, mx in enumerate((9.5, 34.0)):
    hill(painted(f"front{i}", "#E9DFF2", "#FBF8FD"), (mx, -4, -9.6), 10.5, "walk")
x = -20.0
while x < W + 25:
    hill(painted(f"base{x}", "#E3D7EE", "#F3ECF8"), (x, -7, -30.6), 30.2)
    x += 16

# ---------- cabin with snow, a wreath and string lights ----------
cabin = cabin_parts()
cabin += [box(WHITE, (0.80, 0, 2.13), (2.12, 2.6, 0.13), rot=(0, 45, 0)),
          box(WHITE, (-0.80, 0, 2.13), (2.12, 2.6, 0.13), rot=(0, -45, 0)),
          ball(WHITE, (0, 0, 2.88), (0.32, 1.3, 0.16))]
wreath = torus(PURPLE, (0, -1.04, 1.95), 0.34, 0.085)
wreath.rotation_euler = (radians(90), 0, 0)
cabin.append(wreath)
for k in range(6):
    a = k * 3.14159 / 3
    cabin.append(ball(RED if k % 2 else YELLOW, (0.34 * cos(a), -1.12, 1.95 + 0.34 * sin(a)), 0.05, seg=16))
for k in range(-5, 6):
    lx = k * 0.25
    cabin.append(ball((YELLOW, PINK, RED)[k % 3], (lx, -1.3, 2.62 - abs(lx) * 1.0), 0.07, seg=16))
put("cabin", cabin, SX, 3.0, -22, 1.55, sink=0.45)

# ---------- the big decorated tree ----------
TX, TY = SX - 4.9, 0.9
tz = ground_z(TX, TY) - 0.1
cyl(TRUNK, (TX, TY, tz + 0.45), 0.24, 0.9)
tip = pine(TX, TY, tz + 0.7, 4.6, 1.75, PINES)
for i, (k, t) in enumerate(((1.0, 0.0), (0.78, 0.26), (0.56, 0.5), (0.34, 0.72))):
    for j, ang in enumerate((-58, -22, 14, 50)):
        if (i + j) % 2 and i > 1:
            continue
        a = radians(ang + i * 9)
        rr = 1.75 * k * 0.74
        z = tz + 0.7 + 4.6 * t + 4.6 * 0.42 * 0.2
        ball((YELLOW, PINK, WHITE, RED)[(i + j) % 4], (TX + rr * sin(a), TY - rr * cos(a), z), 0.13, seg=24)
ball(YELLOW, (TX, TY, tip + 0.12), (0.3, 0.16, 0.3), seg=32)   # star

# ---------- pets ----------
dog = dog_parts()
dog += [cyl(RED, (0.03, -0.08, 2.12), 0.36, 0.62, rot=(0, 12, 0), r2=0.04),
        torus(WHITE, (0, -0.08, 1.86), 0.37, 0.1),
        ball(WHITE, (0.13, -0.08, 2.45), 0.11)]
put("dog", dog, SX + 4.4, 0.2, -30, 1.08)
put("cat", cat_parts(), SX - 1.7, -1.3, 24, 0.95)


def gift(x, y, s, col, ribbon, rot=0.0):
    z = ground_z(x, y)
    parts = [box(col, (0, 0, s / 2), (s, s, s)),
             box(ribbon, (0, 0, s / 2), (s * 0.2, s * 1.03, s * 1.03)),
             box(ribbon, (0, 0, s / 2), (s * 1.03, s * 0.2, s * 1.03)),
             ball(ribbon, (-s * 0.16, 0, s * 1.08), (s * 0.2, s * 0.12, s * 0.12)),
             ball(ribbon, (s * 0.16, 0, s * 1.08), (s * 0.2, s * 0.12, s * 0.12))]
    group("gift", parts, (x, y, z - 0.03), rot)


gift(SX + 1.7, -1.5, 0.85, PURPLE, YELLOW, 14)
gift(SX + 2.7, -1.9, 0.6, PINK, WHITE, -18)
gift(SX + 2.3, -0.8, 0.5, YELLOW, PURPLE, 30)
gift(SX - 3.2, -1.9, 0.55, RED, WHITE, -10)

# ---------- letterbox with a letter poking out ----------
MX, MY = SX + 7.4, 0.9
mz = ground_z(MX, MY)
mail = [cyl(PURPLE, (0, 0, 0.75), 0.08, 1.5),
        box(PURPLE, (0, 0, 1.75), (1.0, 0.62, 0.6)),
        cyl(PURPLE, (0, 0, 2.05), 0.31, 1.0, rot=(0, 90, 0)),
        box(YELLOW, (0.56, 0.05, 2.05), (0.06, 0.1, 0.5)),
        box(YELLOW, (0.56, 0.05, 2.3), (0.06, 0.3, 0.2)),
        box(WHITE, (-0.1, -0.36, 1.85), (0.6, 0.12, 0.4), rot=(0, 0, 8)),
        ball(RED, (-0.1, -0.44, 1.85), 0.07, seg=16),
        ball(WHITE, (0, 0, 2.36), (0.5, 0.33, 0.08))]
group("mail", mail, (MX, MY, mz - 0.1), -20)

put("lamp", lamp_parts(), SX + 2.7, 2.4, 0, 1.0, sink=0.1)

# a few smaller pines around the scene
for px_, py_, h in ((4.2, 2.2, 3.4), (7.8, -3.4, 2.4), (11.6, 1.6, 2.9), (28.4, -3.2, 2.6), (30.2, 1.8, 3.6)):
    pz = ground_z(px_, py_)
    if pz > -50:
        cyl(TRUNK, (px_, py_, pz + 0.25), 0.14, 0.6)
        pine(px_, py_, pz + 0.3, h, h * 0.36, PINES)

# ---------- light, camera, render ----------
for name, direction, energy, col, angle in (("key", (-0.5, 0.55, -0.67), 2.3, (1.0, 0.97, 0.92), 12),
                                            ("rim", (0.5, -0.7, -0.3), 0.7, (1.0, 0.95, 0.97), 8)):
    sd = bpy.data.lights.new(name, "SUN")
    sd.energy = energy
    sd.color = col
    sd.angle = radians(angle)
    so = bpy.data.objects.new(name, sd)
    scene.collection.objects.link(so)
    so.rotation_euler = Vector(direction).to_track_quat("-Z", "Y").to_euler()

world = bpy.data.worlds.new("world")
world.use_nodes = True
wbg = world.node_tree.nodes["Background"]
wbg.inputs["Color"].default_value = (0.93, 0.96, 1.0, 1)
wbg.inputs["Strength"].default_value = 0.42
scene.world = world

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.type = "ORTHO"
cam.data.clip_end = 400
cam.data.ortho_scale = W
cam.rotation_euler = (radians(90), 0, 0)
cam.location = (W / 2, -60, CAM_Z)
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
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.quality = 86
scene.render.resolution_x = round(H_PX * W / VIEW_H)
scene.render.resolution_y = H_PX
scene.render.filepath = os.path.join(OUT_DIR, "claus-hero.webp")
bpy.ops.render.render(write_still=True)
print("RENDERED", scene.render.filepath, scene.render.resolution_x, "x", H_PX)
