import time
from pathlib import Path
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)

DESKTOP_DIR = Path.home() / 'Desktop'

APK_PATH = Path(__file__).parent / 'TailShare-v1.0.apk'

@app.route('/', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/download', methods=['GET'])
def download_apk():
    if not APK_PATH.exists():
        return jsonify({'status': 'error', 'message': 'APK not found'}), 404
    return send_file(str(APK_PATH), mimetype='application/vnd.android.package-archive',
                     as_attachment=True, download_name='TailShare-v1.0.apk')

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'Empty filename'}), 400

    folder = request.form.get('folder', '').strip()

    save_dir = Path(DESKTOP_DIR) / 'Pixel10'
    if folder:
        save_dir = save_dir / folder

    save_dir.mkdir(parents=True, exist_ok=True)

    dest = save_dir / file.filename
    if dest.exists():
        stem = dest.stem
        suffix = dest.suffix
        timestamp = int(time.time())
        dest = save_dir / f'{stem}_{timestamp}{suffix}'

    try:
        file.save(str(dest))
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

    return jsonify({'status': 'ok', 'path': str(dest)})

if __name__ == '__main__':
    print(f'TailShare server starting...')
    print(f'Listening on port 7800')
    print(f'Saving files to: {Path(DESKTOP_DIR) / "Pixel10"}')
    app.run(host='0.0.0.0', port=7800, debug=False)
