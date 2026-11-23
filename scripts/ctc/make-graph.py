"""Write an ONNX graph whose large initializers point into the original model file.

The weights stay where they are in the single-file model; the graph just
references them by offset, so the original file doubles as external data.

Why: given the single file as bytes, onnxruntime-web holds the model about
four times over while loading (1.07 GB measured), enough for iOS to kill the
tab on an iPhone 12. Loaded as graph + external data it settles at 0.41 GB,
with identical outputs.

Regenerate public/ctc/model_q4.graph.onnx (needs `pip install onnx`):
  python scripts/ctc/make-graph.py model_q4.onnx public/ctc/model_q4.graph.onnx model_q4.onnx
where model_q4.onnx is MODEL_URL in src/lib/ctc/config.ts. The last argument
is the external-data name the worker mounts the original file under.
"""
import sys
import onnx
from onnx import TensorProto

src, dst, location = sys.argv[1], sys.argv[2], sys.argv[3]
buf = open(src, "rb").read()

def varint(b, i):
    v = s = 0
    while True:
        c = b[i]; i += 1; v |= (c & 0x7F) << s; s += 7
        if c < 0x80: return v, i

def fields(b, start, end):
    i = start
    while i < end:
        key, i = varint(b, i); f, wt = key >> 3, key & 7
        if wt == 0: _, i = varint(b, i); continue
        if wt == 1: i += 8; continue
        if wt == 5: i += 4; continue
        if wt != 2: raise ValueError(wt)
        n, i = varint(b, i); yield f, i, i + n; i += n

offsets = []  # (offset, length) of each graph initializer's raw_data, in order
for f, s, e in fields(buf, 0, len(buf)):
    if f != 7: continue  # ModelProto.graph
    for gf, gs, ge in fields(buf, s, e):
        if gf != 5: continue  # GraphProto.initializer
        raw = [(ts, te - ts) for tf, ts, te in fields(buf, gs, ge) if tf == 9]  # TensorProto.raw_data
        offsets.append(raw[0] if raw else None)

m = onnx.load(src)
assert len(m.graph.initializer) == len(offsets), (len(m.graph.initializer), len(offsets))
moved = 0
for t, off in zip(m.graph.initializer, offsets):
    if off is None or off[1] < 1024: continue
    assert buf[off[0]:off[0] + off[1]] == t.raw_data, t.name
    t.ClearField("raw_data")
    t.data_location = TensorProto.EXTERNAL
    for k, v in (("location", location), ("offset", str(off[0])), ("length", str(off[1]))):
        e = t.external_data.add(); e.key, e.value = k, v
    moved += 1
onnx.save_model(m, dst)
print(f"moved {moved} of {len(offsets)} initializers; graph {len(open(dst,'rb').read())} bytes")
