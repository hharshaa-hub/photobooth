import os
import uuid
from flask import Flask, request, send_from_directory, jsonify, url_for
from flask_cors import CORS

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

OUTPUT_DIR = os.path.join(app.static_folder, 'outputs')
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.route('/')
def index():
    # Serve index.html from root
    return app.send_static_file('index.html')

@app.route('/api/upload', methods=['POST'])
def upload():
    # Accepts a file field named 'file' (PNG/JPEG)
    if 'file' not in request.files:
        return jsonify({'error': 'no file field'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    ext = os.path.splitext(file.filename)[1].lower() or '.png'
    if ext not in ['.png', '.jpg', '.jpeg']:
        ext = '.png'

    name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(OUTPUT_DIR, name)
    file.save(save_path)

    # Public URL for the image
    url = url_for('static', filename=f'outputs/{name}', _external=True)
    return jsonify({'url': url, 'filename': name})

@app.route('/photo/<filename>')
def get_photo(filename):
    return send_from_directory(OUTPUT_DIR, filename)

if __name__ == '__main__':
    from pyngrok import ngrok
    app.run(host='0.0.0.0', port=5000, debug=True)
