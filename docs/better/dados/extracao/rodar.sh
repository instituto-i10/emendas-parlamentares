#!/bin/zsh
# rodar.sh <pdf> <prefixo> <primeira> <ultima> [rotacao]
set -e
SP="$(cd "$(dirname "$0")/.." && pwd)"
PDF="$1"; PREF="$2"; INI="$3"; FIM="$4"; ROT="${5:-0}"
mkdir -p "$SP/paginas/$PREF"
: > "$SP/ocr/$PREF.txt"
for p in $(seq $INI $FIM); do
  IMG="$SP/paginas/$PREF/p$(printf '%04d' $p).png"
  if [ "$ROT" = "0" ]; then
    pdftoppm -png -r 300 -f $p -l $p "$PDF" "${IMG%.png}" -singlefile
  else
    pdftoppm -png -r 300 -f $p -l $p "$PDF" "${IMG%.png}" -singlefile
    sips -r $ROT "$IMG" >/dev/null 2>&1
  fi
  echo "@@@PAGINA $p" >> "$SP/ocr/$PREF.txt"
  "$SP/ocr/ocr" texto "$IMG" >> "$SP/ocr/$PREF.txt" 2>/dev/null
  rm -f "$IMG"
done
echo "FIM $PREF: $(wc -l < "$SP/ocr/$PREF.txt") linhas"
