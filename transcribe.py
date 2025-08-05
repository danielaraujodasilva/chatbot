import sys
import whisper

audio_path = sys.argv[1]

model = whisper.load_model("small")
result = model.transcribe(audio_path, language="pt")

print(result["text"])
