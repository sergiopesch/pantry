# sfx.py [names]: the score's sound effects from ElevenLabs' text-to-sound, one per line of sfx.tsv
# (name, seconds, prompt), as 48 kHz stereo WAVs in $PANTRY_VIDEO_WORK/sfx. music.py places them.
# ELEVENLABS_API_KEY in the environment; the key needs the sound effects permission.
import json, os, subprocess, sys, urllib.request
key = os.environ['ELEVENLABS_API_KEY']
out = os.environ.get('PANTRY_VIDEO_WORK', '/tmp/pantry-video') + '/sfx'
os.makedirs(out, exist_ok=True)
only = set(sys.argv[1:])
for line in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sfx.tsv'), encoding='utf8'):
    name, secs, prompt = line.rstrip('\n').split('\t')
    if only and name not in only: continue
    body = json.dumps({'text': prompt, 'duration_seconds': float(secs), 'prompt_influence': 0.6}).encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', data=body,
                                 headers={'xi-api-key': key, 'content-type': 'application/json'})
    open(f'{out}/{name}.mp3', 'wb').write(urllib.request.urlopen(req, timeout=180).read())
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'{out}/{name}.mp3', '-ar', '48000', '-ac', '2', f'{out}/{name}.wav'], check=True)
    print(name, secs, 's')
