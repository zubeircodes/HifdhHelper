#!/usr/bin/env bash
# Download the two candidate models and a fixed set of everyayah clips.
#
#   scripts/asr-bench/fetch.sh [DIR]     (default: .asr-bench)
#
# ~430 MB of models. Only B1's subfolder is fetched: the Synthesium repo is
# 3.6 GB because it bundles unrelated models.
set -euo pipefail

DIR="${1:-.asr-bench}"
mkdir -p "$DIR/models/a/onnx" "$DIR/models/b1" "$DIR/clips"

get() { [ -s "$2" ] || curl -fsSL --retry 3 -o "$2" "$1"; }

A=https://huggingface.co/mostafanewir70/quran-recitation-ctc-onnx/resolve/main
for f in README.md config.json onnx/model_q4.onnx preprocessor_config.json tokenizer.json vocab.json; do
  get "$A/$f" "$DIR/models/a/$f" &
done

B=https://huggingface.co/Synthesium/quran-recitation-v2-onnx/resolve/main/fastconformer-ar-transducer
for f in LICENSE decoder.int8.onnx encoder.int8.onnx joiner.int8.onnx tokens.txt; do
  get "$B/$f" "$DIR/models/b1/$f" &
done

# Three reciters with distinct styles; short and long ayahs, including 2:255.
RECITERS="Alafasy_128kbps Husary_128kbps Minshawy_Murattal_128kbps"
AYAHS="001001 001002 001003 001004 001005 001006 001007
       112001 112002 112003 112004
       113001 113002 113003 113004 113005
       067001 067002 067003 067004 067005
       036001 036002 036003 036004 036005 036006
       002255"
for r in $RECITERS; do
  for a in $AYAHS; do
    get "https://everyayah.com/data/$r/$a.mp3" "$DIR/clips/${r}__$a.mp3" &
  done
  wait
done
wait
du -sh "$DIR/models/a" "$DIR/models/b1" "$DIR/clips"
