# -*- coding: utf-8 -*-
"""Junta a base 2027 (LDO Anexo V) com o mapa função/subfunção (anexos do PPA)."""
import json, io, collections

base = json.load(io.open("ocr/base-2027.json", encoding="utf-8"))
fnsf = json.load(io.open("ocr/fnsf.json", encoding="utf-8"))

# Tabela oficial (Portaria MOG nº 42/1999) — nomes canônicos, sem risco de OCR.
FUNCOES = {
 "01":"Legislativa","02":"Judiciária","03":"Essencial à Justiça","04":"Administração",
 "05":"Defesa Nacional","06":"Segurança Pública","07":"Relações Exteriores",
 "08":"Assistência Social","09":"Previdência Social","10":"Saúde","11":"Trabalho",
 "12":"Educação","13":"Cultura","14":"Direitos da Cidadania","15":"Urbanismo",
 "16":"Habitação","17":"Saneamento","18":"Gestão Ambiental","19":"Ciência e Tecnologia",
 "20":"Agricultura","21":"Organização Agrária","22":"Indústria","23":"Comércio e Serviços",
 "24":"Comunicações","25":"Energia","26":"Transporte","27":"Desporto e Lazer",
 "28":"Encargos Especiais","99":"Reserva de Contingência",
}

# só folhas com forma válida: função de 2 dígitos na tabela, subfunção de 3 dígitos
mapa = collections.defaultdict(collections.Counter)
for f in fnsf["folhas"]:
    fc, sf = f["funcao"], f["subfuncao"]
    if fc in FUNCOES and sf.isdigit() and len(sf) == 3:
        mapa[(f["programa"], f["acao"])][(fc, sf)] += 1

# nomes de subfunção observados (para as que o OCR pegou limpo)
nome_sub = {s["codigo"]: s["nome"] for s in fnsf["subfuncoes"]
            if s["codigo"].isdigit() and len(s["codigo"]) == 3}

# fallback 1: outra ação do MESMO programa no PPA
por_programa = collections.defaultdict(collections.Counter)
for (prog, _acao), cnt in mapa.items():
    for k, v in cnt.items():
        por_programa[prog][k] += v

# fallback 2: casos que o programa não desempata — decididos à mão, com motivo.
# Só um caso caiu aqui; fica explícito para poder ser conferido na fonte.
MANUAL = {
 ("8003", "2845"): ("02", "061",
   "programa 8003 cobre várias funções (bombeiros 06/181, PAT 11/334, Procon "
   "14/422); esta ação é colaboração com o Poder Judiciário → função 02"),
}

achou, faltou = [], []
for l in base["linhas"]:
    ch = (l["programaCodigo"], l["acaoCodigo"])
    fc = sf = None
    if ch in mapa:
        (fc, sf), _ = mapa[ch].most_common(1)[0]
        origem, amb = "ppa-acao", len(mapa[ch]) > 1
    elif ch in MANUAL:
        fc, sf, _motivo = MANUAL[ch]
        origem, amb = "manual", False
    elif l["programaCodigo"] in por_programa:
        cnt = por_programa[l["programaCodigo"]]
        (fc, sf), n1 = cnt.most_common(1)[0]
        origem, amb = "ppa-programa", len(cnt) > 1 and n1 == cnt.most_common(2)[-1][1]
    if fc:
        l["funcaoCodigo"], l["funcaoNome"] = fc, FUNCOES[fc]
        l["subfuncaoCodigo"] = sf
        l["subfuncaoNome"] = nome_sub.get(sf, "")
        l["funcaoOrigem"], l["ambiguo"] = origem, amb
        achou.append(l)
    else:
        faltou.append(l)

print("origem da classificação função/subfunção:")
for o in ("ppa-acao", "ppa-programa", "manual"):
    q = [l for l in achou if l["funcaoOrigem"] == o]
    v = sum(x["custoEstimado"] for x in q)
    print(f"  {o:<14} {len(q):>4} linhas   R$ {v:>16,.2f}")

print(f"linhas da base 2027            : {len(base['linhas'])}")
print(f"  com função/subfunção do PPA  : {len(achou)}  ({100*len(achou)/len(base['linhas']):.0f}%)")
print(f"  sem correspondência          : {len(faltou)}")
amb = sum(1 for l in achou if l['ambiguo'])
print(f"  ação em >1 subfunção         : {amb} (resolvido pela mais frequente)")

vf = sum(l["custoEstimado"] for l in achou)
vt = sum(l["custoEstimado"] for l in base["linhas"])
print(f"cobertura por valor            : R$ {vf:,.2f} de R$ {vt:,.2f}  ({100*vf/vt:.1f}%)")

if faltou:
    print("\nações sem função/subfunção (ação nova na LDO 2027, não estava no PPA):")
    for l in sorted(faltou, key=lambda x: -x["custoEstimado"])[:15]:
        print(f"  {l['orgaoCodigo']}/{l['programaCodigo']}/{l['acaoCodigo']}  "
              f"{l['acaoNome'][:46]:<46} R$ {l['custoEstimado']:>14,.2f}")

base["funcoes"] = [{"codigo": c, "nome": n} for c, n in sorted(FUNCOES.items())]
base["subfuncoes"] = sorted(
    {(l["subfuncaoCodigo"], l["subfuncaoNome"], l["funcaoCodigo"]) for l in achou})
json.dump(base, io.open("ocr/base-2027-completa.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print(f"\nsubfunções efetivamente usadas : {len(base['subfuncoes'])}")
