"""
Vilões do jogo "IA sob Ataque", modelados no Blender (bpy) a partir das
ilustrações das cartas do Letramento IA.

  ladrao   -> carta 5 (Vazamento de Dados): gorro, máscara, pasta amarela
  caixa    -> carta 15 (Explicabilidade): caixa-preta com circuitos e "?"
  barril   -> carta 1 (Risco de Dados): banco de dados rachado com notas adesivas
  boato    -> carta 17 (Reputacional): balão de fala "FAKE"
  balanca  -> carta 2 (Viés Algorítmico): balança desequilibrada com coroa
  cadeado  -> carta 8 (Dependência Tecnológica): cadeado com corrente
  chave    -> carta 13 (Agência Autônoma): chave dourada com etiqueta ADMIN,
              empunhada por uma versão de olhos vermelhos do robô

Os nomes dos pivôs são usados pelo Three.js para animar cada vilão.
Frente em -Y no Blender (+Z no glTF). Pés em z = 0.

Uso:  python modelar_viloes.py <pasta_saida>   (módulo bpy via pip)
      ou blender --background --python modelar_viloes.py -- <pasta_saida>
"""
import math
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from modelar_personagens import mat, pivo, peca, exportar, limpar, prender  # noqa: E402


def texto(nome, s, loc, tam, m, pai=None, rot=(90, 0, 0), extr=0.03):
    cu = bpy.data.curves.new(nome, "FONT")
    cu.body = s
    cu.size = tam
    cu.extrude = extr
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    o = bpy.data.objects.new(nome, cu)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o.select_set(False)
    o.data.materials.append(m)
    if pai:
        prender(o, pai)
    return o


def olhos_bravos(pre, z, y, dx, pai, esc=0.075, sobrancelha=True):
    branco = mat(pre + "olho_branco", (1, 1, 1), rug=0.2, emissao=(1, 1, 1), forca=0.6)
    pupila = mat(pre + "pupila", (0.02, 0.02, 0.03), rug=0.2)
    preto = mat(pre + "sobrancelha", (0.02, 0.02, 0.03), rug=0.5)
    for lado, s in (("E", -1), ("D", 1)):
        peca("esfera", f"{pre}olho_{lado}", (s * dx, y, z), (esc, esc * 0.45, esc * 1.1), m=branco, pai=pai)
        peca("esfera", f"{pre}pupila_{lado}", (s * dx * 0.9, y - esc * 0.4, z - 0.01), (esc * 0.45, esc * 0.2, esc * 0.5), m=pupila, pai=pai)
        if sobrancelha:
            peca("cubo", f"{pre}sobrancelha_{lado}", (s * dx, y - 0.01, z + esc * 1.35), (esc * 1.2, 0.015, 0.018), (0, s * 22, 0), m=preto, pai=pai, suave=False)


# ------------------------------------------------------------------ ladrão
def modelar_ladrao():
    limpar()
    roupa = mat("lad_roupa", (0.07, 0.07, 0.09), rug=0.8)
    listra = mat("lad_listra", (0.3, 0.3, 0.34), rug=0.8)
    pele = mat("lad_pele", (0.93, 0.74, 0.6), rug=0.6)
    preto = mat("lad_preto", (0.01, 0.01, 0.015), rug=0.6)
    pasta = mat("lad_pasta", (0.98, 0.72, 0.12), rug=0.5)
    papel = mat("lad_papel", (0.96, 0.96, 0.93), rug=0.6)

    raiz = pivo("ladrao", (0, 0, 0))
    corpo = pivo("lad_corpo", (0, 0, 0.62), raiz)
    peca("esfera", "lad_tronco", (0, 0, 1.0), (0.33, 0.27, 0.42), m=roupa, pai=corpo)
    for i, z in enumerate((0.84, 1.0, 1.16)):
        peca("toro", f"lad_listra_{i}", (0, 0, z), (1, 0.82, 1), m=listra, pai=corpo, R=0.32 - abs(z - 1.0) * 0.35, r=0.025)

    cab = pivo("lad_cabeca", (0, 0, 1.36), corpo)
    peca("esfera", "lad_rosto", (0, 0, 1.62), (0.27, 0.26, 0.28), m=pele, pai=cab)
    peca("esfera", "lad_gorro", (0, 0.01, 1.74), (0.29, 0.28, 0.22), m=preto, pai=cab)
    peca("toro", "lad_aba", (0, 0, 1.7), (1, 0.97, 1), m=preto, pai=cab, R=0.27, r=0.05)
    peca("cilindro", "lad_mascara", (0, 0, 1.61), (0.278, 0.268, 0.055), m=preto, pai=cab)
    olhos_bravos("lad_", 1.61, -0.265, 0.1, cab, esc=0.065, sobrancelha=False)
    peca("esfera", "lad_nariz", (0, -0.28, 1.52), (0.05, 0.04, 0.045), m=pele, pai=cab)
    peca("cubo", "lad_sorriso", (0.03, -0.255, 1.44), (0.07, 0.01, 0.012), (0, -12, 0), m=preto, pai=cab, suave=False)

    for lado, s in (("E", -1), ("D", 1)):
        omb = pivo(f"lad_ombro_{lado}", (s * 0.31, 0, 1.24), corpo)
        peca("cilindro", f"lad_manga_{lado}", (s * 0.35, 0, 1.02), (0.08, 0.08, 0.2), m=roupa, pai=omb)
        peca("esfera", f"lad_mao_{lado}", (s * 0.36, 0, 0.8), (0.085, 0.085, 0.09), m=preto, pai=omb)
    d = bpy.data.objects["lad_ombro_D"]
    peca("cubo", "lad_pasta", (0.36, -0.12, 0.74), (0.2, 0.035, 0.25), (0, 0, 0), m=pasta, pai=d, suave=False, bev=0.015)
    peca("cubo", "lad_folha", (0.36, -0.165, 0.76), (0.15, 0.01, 0.17), m=papel, pai=d, suave=False)

    for lado, s in (("E", -1), ("D", 1)):
        q = pivo(f"lad_quadril_{lado}", (s * 0.14, 0, 0.66), corpo)
        peca("cilindro", f"lad_perna_{lado}", (s * 0.14, 0, 0.38), (0.1, 0.1, 0.26), m=roupa, pai=q)
        peca("cubo", f"lad_tenis_{lado}", (s * 0.14, -0.06, 0.07), (0.12, 0.2, 0.07), m=preto, pai=q, suave=False, bev=0.05)
    exportar("ladrao")


# ------------------------------------------------------------- caixa-preta
def modelar_caixa():
    limpar()
    preto = mat("cx_preto", (0.015, 0.018, 0.03), metal=0.6, rug=0.2)
    circ = mat("cx_circuito", (0.2, 0.7, 1.0), emissao=(0.2, 0.75, 1.0), forca=3.0)
    interr = mat("cx_interrogacao", (1, 1, 1), emissao=(1, 1, 1), forca=2.5)

    raiz = pivo("caixa", (0, 0, 0))
    corpo = pivo("cx_corpo", (0, 0, 0), raiz)
    peca("cubo", "cx_bloco", (0, 0, 0.62), (0.5, 0.5, 0.5), m=preto, pai=corpo, suave=False, bev=0.04)
    # trilhas de circuito na frente e nas laterais
    trilhas = [(-0.3, 0.9, 0.18, 0), (0.2, 0.8, 0.22, 0), (-0.1, 0.45, 0.25, 0), (0.28, 0.3, 0.14, 0),
               (-0.36, 0.6, 0.012, 0.2), (0.1, 0.62, 0.012, 0.16), (0.36, 0.5, 0.012, 0.2)]
    for i, (x, z, w, h) in enumerate(trilhas):
        peca("cubo", f"cx_trilha_{i}", (x, -0.505, z), (max(w, 0.012), 0.006, max(h, 0.012)), m=circ, pai=corpo, suave=False)
        peca("cubo", f"cx_trilhaL_{i}", (0.505, x, z), (0.006, max(w, 0.012), max(h, 0.012)), m=circ, pai=corpo, suave=False)
    for i, (x, z) in enumerate([(-0.12, 0.9), (0.42, 0.8), (0.15, 0.45), (-0.36, 0.3)]):
        peca("cilindro", f"cx_no_{i}", (x, -0.51, z), (0.035, 0.035, 0.01), (90, 0, 0), m=circ, pai=corpo)
    olhos_bravos("cx_", 0.68, -0.505, 0.16, corpo, esc=0.08)
    tampa = pivo("cx_tampa", (0, 0.5, 1.12), corpo)
    peca("cubo", "cx_tampa_placa", (0, 0, 1.15), (0.54, 0.54, 0.04), m=preto, pai=tampa, suave=False, bev=0.02)
    peca("cubo", "cx_tampa_friso", (0, -0.54, 1.15), (0.5, 0.01, 0.012), m=circ, pai=tampa, suave=False)
    p = pivo("cx_pergunta", (0, 0, 0.75), corpo)
    texto("cx_interrogacao", "?", (0, 0, 0.8), 0.9, interr, pai=p, extr=0.08)
    for lado, s in (("E", -1), ("D", 1)):
        peca("cilindro", f"cx_pe_{lado}", (s * 0.28, 0, 0.06), (0.09, 0.09, 0.06), m=preto, pai=corpo)
    exportar("caixa")


# ------------------------------------------------------ banco de dados rachado
def modelar_barril():
    limpar()
    azul = mat("bar_azul", (0.08, 0.2, 0.45), metal=0.5, rug=0.35)
    aro = mat("bar_aro", (0.35, 0.75, 1.0), emissao=(0.3, 0.75, 1.0), forca=1.5)
    racha = mat("bar_racha", (1.0, 0.15, 0.2), emissao=(1.0, 0.1, 0.18), forca=5.0)
    nota = mat("bar_nota", (1.0, 0.86, 0.25), rug=0.7)
    alerta = mat("bar_alerta", (1.0, 0.15, 0.2), emissao=(1.0, 0.12, 0.18), forca=3.0)
    branco = mat("bar_branco", (1, 1, 1), rug=0.4)

    raiz = pivo("barril", (0, 0, 0))
    corpo = pivo("bar_corpo", (0, 0, 0), raiz)
    for i, z in enumerate((0.2, 0.55, 0.9)):
        peca("cilindro", f"bar_disco_{i}", (0, 0, z), (0.46, 0.46, 0.16), m=azul, pai=corpo)
        peca("toro", f"bar_aro_{i}", (0, 0, z + 0.17), (1, 1, 1), m=aro, pai=corpo, R=0.46, r=0.018)
    peca("cilindro", "bar_topo", (0, 0, 1.08), (0.46, 0.46, 0.02), m=azul, pai=corpo)
    # rachaduras em zigue-zague
    zz = [(-0.18, 0.25, 30), (-0.1, 0.36, -40), (-0.02, 0.48, 35), (0.05, 0.6, -30), (0.14, 0.75, 45), (0.2, 0.3, -50), (0.26, 0.2, 30)]
    for i, (x, z, a) in enumerate(zz):
        peca("cubo", f"bar_racha_{i}", (x, -0.455 + abs(x) * 0.12, z), (0.07, 0.006, 0.012), (0, a, 0), m=racha, pai=corpo, suave=False)
    for i, (x, y, z, ang, rz) in enumerate([(-0.3, -0.35, 0.62, 15, 40), (0.35, -0.3, 0.42, -12, -40), (0.46, 0.05, 0.8, 8, -90), (-0.12, -0.46, 0.2, -6, 0)]):
        n = peca("cubo", f"bar_nota_{i}", (x, y, z), (0.09, 0.006, 0.09), (0, ang, rz), m=nota, pai=corpo, suave=False)
    olhos_bravos("bar_", 0.9, -0.46, 0.14, corpo, esc=0.08)
    a = pivo("bar_alerta", (0, 0, 1.45), corpo)
    peca("cilindro", "bar_triangulo", (0, 0, 1.43), (0.22, 0.22, 0.025), (90, 0, 0), m=alerta, pai=a, suave=False, v=3)
    peca("cubo", "bar_exclamacao", (0, -0.03, 1.45), (0.018, 0.01, 0.06), m=branco, pai=a, suave=False)
    peca("cubo", "bar_ponto", (0, -0.03, 1.36), (0.018, 0.01, 0.018), m=branco, pai=a, suave=False)
    exportar("barril")


# ------------------------------------------------------------ boato "FAKE"
def modelar_boato():
    limpar()
    branco = mat("bt_branco", (0.97, 0.97, 0.98), rug=0.35)
    vermelho = mat("bt_vermelho", (0.9, 0.08, 0.12), emissao=(1.0, 0.1, 0.15), forca=1.2)
    borda = mat("bt_borda", (0.85, 0.1, 0.15), rug=0.4)

    raiz = pivo("boato", (0, 0, 0))
    corpo = pivo("bt_corpo", (0, 0, 0.9), raiz)
    peca("cubo", "bt_balao", (0, 0, 1.25), (0.62, 0.14, 0.38), m=branco, pai=corpo, suave=False, bev=0.2)
    peca("cubo", "bt_contorno", (0, 0.02, 1.25), (0.66, 0.12, 0.42), m=borda, pai=corpo, suave=False, bev=0.22)
    peca("cone", "bt_rabo", (-0.3, 0.0, 0.8), (1, 0.45, 0.14), (0, -160, 0), m=borda, pai=corpo, r1=0.14, r2=0.0)
    texto("bt_texto", "FAKE", (0, -0.15, 1.22), 0.34, vermelho, pai=corpo, extr=0.04)
    olhos_bravos("bt_", 1.52, -0.14, 0.13, corpo, esc=0.06)
    # polegares para baixo orbitando
    orb = pivo("bt_orbita", (0, 0, 1.25), corpo)
    for i, a in enumerate((0, 180)):
        x, y = math.cos(math.radians(a)) * 0.95, math.sin(math.radians(a)) * 0.95
        peca("esfera", f"bt_polegar_{i}", (x, y, 1.25), (0.1, 0.08, 0.13), m=vermelho, pai=orb)
        peca("cubo", f"bt_dedo_{i}", (x, y, 1.1), (0.035, 0.035, 0.07), m=vermelho, pai=orb, suave=False, bev=0.02)
    exportar("boato")


# --------------------------------------------------- balança desequilibrada
def modelar_balanca():
    limpar()
    ouro = mat("bal_ouro", (0.95, 0.68, 0.2), metal=0.9, rug=0.25)
    escuro = mat("bal_escuro", (0.25, 0.16, 0.06), metal=0.6, rug=0.4)
    corda = mat("bal_corda", (0.8, 0.6, 0.25), metal=0.5, rug=0.4)
    joia = mat("bal_joia", (1.0, 0.2, 0.3), emissao=(1, 0.15, 0.25), forca=2.0)
    pessoa = mat("bal_pessoa", (0.45, 0.6, 0.85), rug=0.6)

    raiz = pivo("balanca", (0, 0, 0))
    corpo = pivo("bal_corpo", (0, 0, 0), raiz)
    peca("cilindro", "bal_base", (0, 0, 0.05), (0.36, 0.36, 0.05), m=escuro, pai=corpo)
    peca("cilindro", "bal_degrau", (0, 0, 0.13), (0.24, 0.24, 0.04), m=ouro, pai=corpo)
    peca("cilindro", "bal_coluna", (0, 0, 0.75), (0.05, 0.05, 0.6), m=ouro, pai=corpo)
    peca("esfera", "bal_topo", (0, 0, 1.42), (0.08, 0.08, 0.08), m=ouro, pai=corpo)
    olhos_bravos("bal_", 1.1, -0.06, 0.07, corpo, esc=0.05)
    braco = pivo("bal_braco", (0, 0, 1.33), corpo)
    peca("cubo", "bal_travessa", (0, 0, 1.33), (0.82, 0.03, 0.03), m=ouro, pai=braco, suave=False, bev=0.01)
    for lado, s in (("E", -1), ("D", 1)):
        pr = pivo(f"bal_prato_{lado}", (s * 0.8, 0, 1.33), braco)
        for k, a in enumerate((0, 120, 240)):
            dx, dy = math.cos(math.radians(a)) * 0.16, math.sin(math.radians(a)) * 0.16
            peca("cilindro", f"bal_fio_{lado}_{k}", (s * 0.8 + dx / 2, dy / 2, 1.08), (0.008, 0.008, 0.25), (math.degrees(-dy / 0.5), math.degrees(dx / 0.5), 0), m=corda, pai=pr, v=6)
        peca("cilindro", f"bal_prato_{lado}_disco", (s * 0.8, 0, 0.83), (0.26, 0.26, 0.025), m=ouro, pai=pr)
    # prato esquerdo: três pequenas figuras ("menos oportunidades")
    pe = bpy.data.objects["bal_prato_E"]
    for k, x in enumerate((-0.92, -0.8, -0.68)):
        peca("cilindro", f"bal_fig_{k}", (x, 0, 0.92), (0.04, 0.04, 0.07), m=pessoa, pai=pe)
        peca("esfera", f"bal_figcab_{k}", (x, 0, 1.03), (0.04, 0.04, 0.04), m=pessoa, pai=pe)
    # prato direito: coroa ("mais oportunidades")
    pd = bpy.data.objects["bal_prato_D"]
    peca("cilindro", "bal_coroa", (0.8, 0, 0.93), (0.13, 0.13, 0.06), m=ouro, pai=pd, v=24)
    for k in range(5):
        a = k * 72
        peca("cone", f"bal_ponta_{k}", (0.8 + math.cos(math.radians(a)) * 0.11, math.sin(math.radians(a)) * 0.11, 1.04), (1, 1, 0.05), m=ouro, pai=pd, r1=0.035, r2=0.0)
    peca("esfera", "bal_rubi", (0.8, -0.13, 0.94), (0.03, 0.02, 0.03), m=joia, pai=pd)
    exportar("balanca")


# ------------------------------------------------------- cadeado e corrente
def modelar_cadeado():
    limpar()
    latao = mat("cad_latao", (0.95, 0.66, 0.18), metal=0.9, rug=0.28)
    aco = mat("cad_aco", (0.75, 0.78, 0.82), metal=1.0, rug=0.25)
    preto = mat("cad_preto", (0.02, 0.02, 0.02), rug=0.6)

    raiz = pivo("cadeado", (0, 0, 0))
    corpo = pivo("cad_corpo", (0, 0, 0), raiz)
    peca("cubo", "cad_bloco", (0, 0, 0.55), (0.42, 0.22, 0.38), m=latao, pai=corpo, suave=False, bev=0.1)
    peca("cilindro", "cad_fechadura", (0, -0.225, 0.42), (0.06, 0.06, 0.01), (90, 0, 0), m=preto, pai=corpo)
    peca("cubo", "cad_fenda", (0, -0.225, 0.33), (0.025, 0.01, 0.07), m=preto, pai=corpo, suave=False)
    olhos_bravos("cad_", 0.68, -0.22, 0.15, corpo, esc=0.075)
    arco = pivo("cad_arco", (0.26, 0, 0.93), corpo)
    peca("toro", "cad_argola", (0, 0, 0.93), (1, 1, 1.25), (90, 0, 0), m=aco, pai=arco, R=0.26, r=0.055)
    cor = pivo("cad_corrente", (0, 0, 0.55), corpo)
    n = 14
    for i in range(n):
        a = i / n * math.tau
        x, y = math.cos(a) * 0.62, math.sin(a) * 0.4
        peca("toro", f"cad_elo_{i}", (x, y, 0.55 + math.sin(a * 2) * 0.05), (1, 1, 1.5),
             (90 if i % 2 else 0, 0, math.degrees(a) + 90), m=aco, pai=cor, R=0.07, r=0.022)
    exportar("cadeado")


# ------------------------------------------------------------ chave ADMIN
def modelar_chave():
    limpar()
    ouro = mat("chave_ouro", (1.0, 0.75, 0.2), metal=0.9, rug=0.2, emissao=(1.0, 0.7, 0.2), forca=0.4)
    etiqueta = mat("chave_etiqueta", (0.9, 0.12, 0.15), rug=0.5)
    letra = mat("chave_letra", (1, 1, 1), emissao=(1, 1, 1), forca=1.0)
    raiz = pivo("chave", (0, 0, 0))
    peca("toro", "chave_anel", (0, 0, 0.22), (1, 1, 1), (90, 0, 0), m=ouro, pai=raiz, R=0.13, r=0.04)
    peca("cilindro", "chave_haste", (0, 0, -0.12), (0.035, 0.035, 0.22), m=ouro, pai=raiz)
    for k, z in enumerate((-0.26, -0.18)):
        peca("cubo", f"chave_dente_{k}", (0.06, 0, z), (0.06, 0.02, 0.03), m=ouro, pai=raiz, suave=False)
    peca("cubo", "chave_etiqueta", (0.2, 0, 0.36), (0.14, 0.01, 0.06), (0, -30, 0), m=etiqueta, pai=raiz, suave=False, bev=0.01)
    texto("chave_admin", "ADMIN", (0.2, -0.015, 0.36), 0.07, letra, pai=raiz, rot=(90, -30, 0), extr=0.004)
    exportar("chave")


if __name__ == "__main__":
    modelar_ladrao()
    modelar_caixa()
    modelar_barril()
    modelar_boato()
    modelar_balanca()
    modelar_cadeado()
    modelar_chave()
