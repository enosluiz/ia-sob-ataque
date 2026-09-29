"""
Modelagem procedural das peças 3D do jogo "IA sob Ataque" no Blender (bpy).

Gera dois arquivos glTF binários, carregados pelo Three.js:
  - nucleo.glb : núcleo da AI Factory (pedestal hexagonal, câmara de vidro,
                 anel luminoso), inspirado nos pôsteres "IA não é apenas um LLM"
  - escudo.glb : escudo de defesa com marca de verificação em relevo

Uso:
  blender --background --python modelar_pecas.py -- <pasta_saida>
  ou, com o módulo bpy instalado via pip:  python modelar_pecas.py <pasta_saida>
"""
import sys
import math
import os
import bpy
import bmesh

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
OUT = os.path.abspath(args[0] if args else ".")
os.makedirs(OUT, exist_ok=True)


def limpar_cena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(nome, cor, metal=0.8, rug=0.3, emissao=None, forca=0.0, alfa=1.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*cor, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rug
    if emissao:
        b.inputs["Emission Color"].default_value = (*emissao, 1)
        b.inputs["Emission Strength"].default_value = forca
    if alfa < 1:
        b.inputs["Alpha"].default_value = alfa
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    return m


def suavizar(obj, angulo=40):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angulo))
    except Exception:
        bpy.ops.object.shade_smooth()
    obj.select_set(False)


def bevel(obj, largura=0.02, seg=3):
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = largura
    mod.segments = seg
    mod.limit_method = "ANGLE"


def exportar(caminho):
    bpy.ops.export_scene.gltf(
        filepath=caminho,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
    )
    print("exportado:", caminho)


# ---------------------------------------------------------------- núcleo
def modelar_nucleo():
    limpar_cena()
    aco = material("aco_escuro", (0.05, 0.07, 0.10), metal=0.9, rug=0.35)
    ouro = material("friso_ambar", (0.95, 0.62, 0.15), metal=0.6, rug=0.3,
                    emissao=(1.0, 0.65, 0.2), forca=2.0)
    ciano = material("luz_ciano", (0.1, 0.9, 1.0), metal=0.0, rug=0.2,
                     emissao=(0.2, 0.9, 1.0), forca=6.0)
    vidro = material("vidro", (0.55, 0.85, 1.0), metal=0.0, rug=0.05, alfa=0.18)

    # base hexagonal em degraus
    for i, (r, h, z) in enumerate([(1.6, 0.25, 0.125), (1.35, 0.22, 0.36), (1.15, 0.12, 0.53)]):
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=r, depth=h, location=(0, 0, z))
        o = bpy.context.object
        o.name = f"base_{i}"
        o.data.materials.append(aco)
        bevel(o, 0.03)
    # friso luminoso da base
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=8,
                                     major_radius=1.08, minor_radius=0.03, location=(0, 0, 0.6))
    bpy.context.object.data.materials.append(ouro)

    # câmara de vidro
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.95, depth=1.8, location=(0, 0, 1.5))
    c = bpy.context.object
    c.name = "camara_vidro"
    c.data.materials.append(vidro)

    # colunas nos vértices do hexágono
    for k in range(6):
        a = k * math.pi / 3
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0.98 * math.cos(a), 0.98 * math.sin(a), 1.5))
        p = bpy.context.object
        p.scale = (0.07, 0.07, 0.95)
        p.rotation_euler[2] = a
        p.data.materials.append(aco)
        bevel(p, 0.02)

    # tampa superior
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=1.12, depth=0.22, location=(0, 0, 2.5))
    t = bpy.context.object
    t.data.materials.append(aco)
    bevel(t, 0.03)
    bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=12,
                                     major_radius=0.62, minor_radius=0.035, location=(0, 0, 2.36))
    bpy.context.object.name = "anel_luz"
    bpy.context.object.data.materials.append(ciano)

    # núcleo energético (icosfera) — no Three.js recebe pulsação
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.42, location=(0, 0, 1.5))
    n = bpy.context.object
    n.name = "cerne"
    n.data.materials.append(ciano)
    suavizar(n)

    exportar(os.path.join(OUT, "nucleo.glb"))


# ---------------------------------------------------------------- escudo
def modelar_escudo():
    limpar_cena()
    aco = material("escudo_aco", (0.08, 0.2, 0.45), metal=0.85, rug=0.25)
    borda = material("escudo_borda", (0.25, 0.85, 1.0), metal=0.3, rug=0.2,
                     emissao=(0.2, 0.85, 1.0), forca=3.0)
    check = material("escudo_check", (1.0, 1.0, 1.0), metal=0.1, rug=0.3,
                     emissao=(0.8, 1.0, 1.0), forca=2.0)

    # contorno do escudo (curva 2D extrudada)
    pts = []
    for i in range(0, 21):  # topo arredondado
        t = i / 20
        x = -1 + 2 * t
        y = 1.0 + 0.12 * math.sin(math.pi * t)
        pts.append((x, y))
    for i in range(1, 11):  # lateral reta
        pts.append((1.0, 1.0 - 0.9 * i / 10))
    for i in range(1, 21):  # curva até a ponta
        t = i / 20
        pts.append((1.0 * math.cos(t * math.pi / 2) ** 0.9 if t < 1 else 0.0,
                    0.1 - 1.4 * math.sin(t * math.pi / 2)))
    direita = pts[21:]
    for x, y in reversed(direita[:-1]):
        pts.append((-x, y))

    def extrudar(nome, pontos, espessura, escala=1.0, z=0.0, mat=None):
        me = bpy.data.meshes.new(nome)
        bm = bmesh.new()
        vs = [bm.verts.new((px * escala, py * escala - 0.1 * (1 - escala), z)) for px, py in pontos]
        f = bm.faces.new(vs)
        r = bmesh.ops.extrude_face_region(bm, geom=[f])
        for v in [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]:
            v.co.z += espessura
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(nome, me)
        bpy.context.collection.objects.link(o)
        o.data.materials.append(mat)
        bevel(o, 0.03, 4)
        return o

    extrudar("escudo_borda", pts, 0.18, 1.0, 0.0, borda)
    extrudar("escudo_face", pts, 0.12, 0.86, 0.12, aco)

    # marca de verificação (✓) em relevo
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.22, -0.28, 0.3))
    a = bpy.context.object
    a.scale = (0.5, 0.16, 0.08)
    a.rotation_euler[2] = math.radians(-45)
    a.data.materials.append(check)
    bevel(a, 0.03)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.22, -0.02, 0.3))
    b = bpy.context.object
    b.scale = (0.95, 0.16, 0.08)
    b.rotation_euler[2] = math.radians(50)
    b.data.materials.append(check)
    bevel(b, 0.03)

    # o escudo fica deitado no plano XY do Blender; o Three.js o põe de pé
    exportar(os.path.join(OUT, "escudo.glb"))


if __name__ == "__main__":
    modelar_nucleo()
    modelar_escudo()
