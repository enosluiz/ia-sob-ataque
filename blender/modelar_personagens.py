"""
Personagens do jogo "IA sob Ataque", modelados no Blender (bpy).

  - robo.glb    : o robô "IA" das cartas do Letramento IA (corpo branco,
                  visor escuro, olhos ciano, fones azuis, emblema no peito)
  - invasor.glb : a figura encapuzada de olhos vermelhos das cartas 4 e 10

Cada personagem é uma hierarquia de pivôs nomeados. O Three.js anima esses
pivôs em tempo real (cabeça, ombros, quadris, olhos), o que permite reagir
às jogadas do aluno em vez de tocar clipes fixos.

  Robô:    robo > robo_corpo_pivo > robo_cabeca, robo_ombro_E/D, robo_quadril_E/D
           olhos: robo_olho_E / robo_olho_D
  Invasor: invasor > inv_corpo_pivo > inv_cabeca, inv_ombro_E/D
           olhos: inv_olho_E / inv_olho_D

A frente dos personagens aponta para -Y no Blender (+Z no glTF/Three.js).

Uso:
  blender --background --python modelar_personagens.py -- <pasta_saida>
  ou:  python modelar_personagens.py <pasta_saida>   (módulo bpy via pip)
"""
import sys
import math
import os
import bpy

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
OUT = os.path.abspath(args[0] if args else ".")
os.makedirs(OUT, exist_ok=True)


def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(nome, cor, metal=0.0, rug=0.45, emissao=None, forca=0.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*cor, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rug
    if emissao:
        b.inputs["Emission Color"].default_value = (*emissao, 1)
        b.inputs["Emission Strength"].default_value = forca
    return m


def liso(o):
    for p in o.data.polygons:
        p.use_smooth = True


def bevel(o, w=0.05, seg=4):
    m = o.modifiers.new("bevel", "BEVEL")
    m.width = w
    m.segments = seg
    m.limit_method = "ANGLE"


def pivo(nome, loc, pai=None):
    e = bpy.data.objects.new(nome, None)
    bpy.context.collection.objects.link(e)
    e.location = loc
    if pai:
        prender(e, pai)
    return e


def prender(filho, pai):
    bpy.context.view_layer.update()
    mw = filho.matrix_world.copy()
    filho.parent = pai
    filho.matrix_world = mw


def peca(tipo, nome, loc, escala=(1, 1, 1), rot=(0, 0, 0), m=None, pai=None, suave=True, **kw):
    ops = {
        "esfera": lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=loc),
        "cubo": lambda: bpy.ops.mesh.primitive_cube_add(size=2, location=loc),
        "cilindro": lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=kw.get("v", 32), radius=1, depth=2, location=loc),
        "cone": lambda: bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=kw.get("r1", 1), radius2=kw.get("r2", 0), depth=2, location=loc),
        "toro": lambda: bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=12, major_radius=kw.get("R", 1), minor_radius=kw.get("r", .1), location=loc),
    }
    ops[tipo]()
    o = bpy.context.object
    o.name = nome
    o.scale = escala
    o.rotation_euler = [math.radians(a) for a in rot]
    if m:
        o.data.materials.append(m)
    if suave:
        liso(o)
    if "bev" in kw:
        bevel(o, kw["bev"], 5)
    if pai:
        prender(o, pai)
    return o


def exportar(nome):
    caminho = os.path.join(OUT, nome + ".glb")
    bpy.ops.export_scene.gltf(filepath=caminho, export_format="GLB", export_apply=True, export_yup=True)
    print("exportado:", caminho)


# ------------------------------------------------------------------ robô
def modelar_robo():
    limpar()
    branco = mat("robo_branco", (0.93, 0.95, 0.98), rug=0.3)
    azul = mat("robo_azul", (0.06, 0.2, 0.62), metal=0.2, rug=0.35)
    visor = mat("robo_visor", (0.01, 0.015, 0.03), metal=0.3, rug=0.12)
    olho = mat("robo_olho", (0.3, 0.95, 1.0), emissao=(0.3, 0.95, 1.0), forca=8.0)
    emblema = mat("robo_emblema", (0.2, 0.75, 1.0), emissao=(0.2, 0.7, 1.0), forca=2.5)

    raiz = pivo("robo", (0, 0, 0))
    corpo = pivo("robo_corpo_pivo", (0, 0, 0.55), raiz)

    # tronco em forma de ovo, com painel azul e emblema luminoso
    peca("esfera", "robo_tronco", (0, 0, 0.95), (0.40, 0.34, 0.44), m=branco, pai=corpo)
    peca("cilindro", "robo_painel", (0, -0.30, 0.93), (0.17, 0.17, 0.03), (90, 0, 0), m=azul, pai=corpo)
    peca("toro", "robo_emblema", (0, -0.335, 0.93), (1, 1, 1), (90, 0, 0), m=emblema, pai=corpo, R=0.12, r=0.02)
    peca("cilindro", "robo_cinto", (0, 0, 0.66), (0.34, 0.3, 0.05), m=azul, pai=corpo)

    # cabeça grande, arredondada, com visor e fones
    cab = pivo("robo_cabeca", (0, 0, 1.33), corpo)
    peca("cubo", "robo_cranio", (0, 0, 1.72), (0.42, 0.34, 0.33), m=branco, pai=cab, suave=False, bev=0.2)
    peca("cubo", "robo_visor", (0, -0.27, 1.71), (0.33, 0.08, 0.22), m=visor, pai=cab, suave=False, bev=0.1)
    for lado, s in (("E", -1), ("D", 1)):
        o = peca("esfera", f"robo_olho_{lado}", (s * 0.13, -0.355, 1.73), (0.075, 0.03, 0.1), m=olho, pai=cab)
        peca("cilindro", f"robo_fone_{lado}", (s * 0.43, 0, 1.72), (0.15, 0.15, 0.07), (0, 90, 0), m=azul, pai=cab)
        peca("cilindro", f"robo_fone_miolo_{lado}", (s * 0.5, 0, 1.72), (0.08, 0.08, 0.02), (0, 90, 0), m=emblema, pai=cab)

    # braços: pivô no ombro, braço pendendo em -Z
    for lado, s in (("E", -1), ("D", 1)):
        omb = pivo(f"robo_ombro_{lado}", (s * 0.40, 0, 1.18), corpo)
        peca("esfera", f"robo_junta_{lado}", (s * 0.42, 0, 1.18), (0.1, 0.1, 0.1), m=azul, pai=omb)
        peca("cilindro", f"robo_braco_{lado}", (s * 0.46, 0, 0.98), (0.085, 0.085, 0.19), m=branco, pai=omb)
        peca("esfera", f"robo_mao_{lado}", (s * 0.47, 0, 0.74), (0.12, 0.12, 0.12), m=branco, pai=omb)
        peca("toro", f"robo_punho_{lado}", (s * 0.465, 0, 0.83), (1, 1, 1), m=azul, pai=omb, R=0.085, r=0.025)

    # pernas curtas com botas azuis
    for lado, s in (("E", -1), ("D", 1)):
        q = pivo(f"robo_quadril_{lado}", (s * 0.18, 0, 0.62), corpo)
        peca("cilindro", f"robo_perna_{lado}", (s * 0.18, 0, 0.36), (0.11, 0.11, 0.2), m=branco, pai=q)
        peca("cubo", f"robo_bota_{lado}", (s * 0.18, -0.05, 0.09), (0.15, 0.21, 0.09), m=azul, pai=q, suave=False, bev=0.07)

    # recoloca o corpo: os pés tocam z = 0 com o pivô do corpo na cintura
    exportar("robo")


# ---------------------------------------------------------------- invasor
def modelar_invasor():
    limpar()
    manto = mat("inv_manto", (0.05, 0.035, 0.09), rug=0.8)
    forro = mat("inv_forro", (0.14, 0.05, 0.22), rug=0.7)
    vazio = mat("inv_vazio", (0.0, 0.0, 0.0), rug=1.0)
    olho = mat("inv_olho", (1.0, 0.1, 0.15), emissao=(1.0, 0.08, 0.12), forca=12.0)
    brasa = mat("inv_brasa", (0.9, 0.1, 0.2), emissao=(1.0, 0.1, 0.2), forca=3.0)
    luva = mat("inv_luva", (0.08, 0.08, 0.1), rug=0.6)

    raiz = pivo("invasor", (0, 0, 0))
    corpo = pivo("inv_corpo_pivo", (0, 0, 0.2), raiz)

    # manto cônico flutuante com barra brilhante
    peca("cone", "inv_manto", (0, 0, 0.75), (1, 0.9, 0.62), m=manto, pai=corpo, r1=0.55, r2=0.22)
    peca("toro", "inv_barra", (0, 0, 0.15), (1, 0.9, 1), m=brasa, pai=corpo, R=0.53, r=0.025)
    peca("esfera", "inv_ombreira", (0, 0, 1.28), (0.34, 0.3, 0.16), m=manto, pai=corpo)

    # capuz com rosto oco e olhos vermelhos
    cab = pivo("inv_cabeca", (0, 0, 1.35), corpo)
    peca("esfera", "inv_capuz", (0, 0.03, 1.62), (0.33, 0.33, 0.37), m=manto, pai=cab)
    peca("cone", "inv_ponta", (0, 0.2, 1.9), (1, 1, 0.14), (-35, 0, 0), m=manto, pai=cab, r1=0.16, r2=0.0)
    peca("esfera", "inv_abertura", (0, -0.2, 1.58), (0.25, 0.14, 0.27), m=forro, pai=cab)
    peca("esfera", "inv_rosto", (0, -0.24, 1.58), (0.21, 0.12, 0.23), m=vazio, pai=cab)
    for lado, s in (("E", -1), ("D", 1)):
        peca("esfera", f"inv_olho_{lado}", (s * 0.085, -0.35, 1.62), (0.06, 0.02, 0.035), (0, s * 12, 0), m=olho, pai=cab)

    # mangas e mãos
    for lado, s in (("E", -1), ("D", 1)):
        omb = pivo(f"inv_ombro_{lado}", (s * 0.3, 0, 1.25), corpo)
        peca("cone", f"inv_manga_{lado}", (s * 0.36, -0.02, 1.02), (1, 1, 0.2), m=manto, pai=omb, r1=0.13, r2=0.09)
        peca("esfera", f"inv_mao_{lado}", (s * 0.37, -0.03, 0.74), (0.09, 0.09, 0.1), m=luva, pai=omb)

    exportar("invasor")


if __name__ == "__main__":
    modelar_robo()
    modelar_invasor()
