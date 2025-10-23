import sys
import whisper
import os
from deep_translator import GoogleTranslator

# ========================
# 🧭 工具函式
# ========================
# def format_time(t):
def format_time_vtt(t):
    t = max(0, t)  # 避免負時間
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int((t - int(t)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

# ========================
# 📥 讀取參數
# ========================
if len(sys.argv) < 2:
    print("❌ 請輸入影片檔案，例如：python whisper_subtitle.py myvideo.mp4")
    sys.exit(1)

video_file = sys.argv[1]
output_folder = "public/subtitles"
os.makedirs(output_folder, exist_ok=True)  # ✅ 自動建立資料夾
# 字幕輸出檔名（取影片檔名）
base_name = os.path.splitext(os.path.basename(video_file))[0]
# srt_file = os.path.join(output_folder, f"{base_name}.srt")
vtt_file = os.path.join(output_folder, f"{base_name}.vtt")

# ========================
# 🧠 Whisper 轉錄
# ========================
print(f"🎧 正在轉錄音訊：{video_file} ...")
model = whisper.load_model("base")  # 可改成 "medium" / "large" 提高準確率
result = model.transcribe(video_file)

# ========================
# ⏳ 處理時間與排序
# ========================
segments = sorted(result["segments"], key=lambda x: x["start"])

# ========================
# 🌏 翻譯英文 → 中文
# ========================
print("🌍 正在翻譯字幕為中文...")
for seg in segments:
    en_text = seg["text"].strip()
    zh_text = GoogleTranslator(source='en', target='zh-TW').translate(en_text)
    seg["zh_text"] = zh_text

# ========================
# 📝 輸出 SRT 字幕檔（雙語版本）
# ========================
with open(vtt_file, "w", encoding="utf-8") as f:
    f.write("WEBVTT\n\n")
    for i, seg in enumerate(segments, 1):
        start = round(seg["start"], 3)
        end = max(start + 0.01, round(seg["end"], 3))
        f.write(f"{format_time_vtt(start)} --> {format_time_vtt(end)}\n")
        f.write(f"{seg['zh_text']}\n{seg['text'].strip()}\n\n")
        # f.write(f"{i}\n")
        # f.write(f"{format_time(start)} --> {format_time(end)}\n")
        # # 雙語字幕（中 + 英）
        # f.write(f"{seg['zh_text']}\n{seg['text'].strip()}\n\n")

print(f"✅ 字幕檔已完成：{vtt_file}")
