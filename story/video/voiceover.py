# voiceover.py [line ids]: the narration in ElevenLabs' "Lily" (UK), with word timings for the cuts and subtitles.
# ELEVENLABS_API_KEY in the environment (Sergio's is in 1Password, item ElevenLabs, field "API Key").
import json, sys, base64, urllib.request, subprocess, os
key = os.environ['ELEVENLABS_API_KEY']
VOICE = 'pFZP5JQG7iQjIQuC4Bku'
out = os.environ.get('PANTRY_VIDEO_WORK', '/tmp/pantry-video') + '/vo'
os.makedirs(out, exist_ok=True)
only = set(sys.argv[1:])
for line in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'narration.tsv'), encoding='utf8'):
    vid, text = line.rstrip('\n').split('\t', 1)
    if only and vid not in only: continue
    body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.55, "similarity_boost": 0.8, "style": 0.1, "use_speaker_boost": True}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128', data=body, headers={'xi-api-key': key, 'content-type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=180))
    open(f'{out}/{vid}.mp3', 'wb').write(base64.b64decode(d['audio_base64']))
    al = d['alignment']
    # word timings from the character alignment
    words, cur, start = [], '', None
    for ch, s, e in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if ch.isspace():
            if cur: words.append((cur, round(start, 3), round(prev_end, 3))); cur = ''
            continue
        if not cur: start = s
        cur += ch; prev_end = e
    if cur: words.append((cur, round(start, 3), round(prev_end, 3)))
    json.dump({'id': vid, 'text': text, 'words': words}, open(f'{out}/{vid}.json', 'w'), indent=0)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'{out}/{vid}.mp3', '-ar', '48000', '-ac', '1', f'{out}/{vid}.wav'], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{out}/{vid}.wav'], capture_output=True, text=True).stdout)
    print(vid, f'{dur:.2f}s', ' '.join(f'{w}@{s:.2f}' for w, s, e in words)[:400])
