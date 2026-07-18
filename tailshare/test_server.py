import json
from io import BytesIO
from pathlib import Path
import pytest
from server import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_upload_file_no_folder(client, tmp_path, monkeypatch):
    monkeypatch.setattr('server.DESKTOP_DIR', str(tmp_path))
    data = {'file': (BytesIO(b'hello world'), 'test.txt')}
    resp = client.post('/upload', data=data, content_type='multipart/form-data')
    assert resp.status_code == 200
    body = json.loads(resp.data)
    assert body['status'] == 'ok'
    assert (tmp_path / 'Pixel10' / 'test.txt').read_text() == 'hello world'

def test_upload_file_with_folder(client, tmp_path, monkeypatch):
    monkeypatch.setattr('server.DESKTOP_DIR', str(tmp_path))
    data = {'file': (BytesIO(b'pdf content'), 'doc.pdf'), 'folder': 'Receipts'}
    resp = client.post('/upload', data=data, content_type='multipart/form-data')
    assert resp.status_code == 200
    assert (tmp_path / 'Pixel10' / 'Receipts' / 'doc.pdf').read_text() == 'pdf content'

def test_upload_duplicate_filename(client, tmp_path, monkeypatch):
    monkeypatch.setattr('server.DESKTOP_DIR', str(tmp_path))
    (tmp_path / 'Pixel10').mkdir(parents=True, exist_ok=True)
    (tmp_path / 'Pixel10' / 'test.txt').write_text('original')
    data = {'file': (BytesIO(b'new version'), 'test.txt')}
    resp = client.post('/upload', data=data, content_type='multipart/form-data')
    assert resp.status_code == 200
    assert (tmp_path / 'Pixel10' / 'test.txt').read_text() == 'original'
    pixel10_dir = tmp_path / 'Pixel10'
    saved_files = list(pixel10_dir.iterdir())
    assert len(saved_files) == 2
    assert any('test_' in f.name for f in saved_files)

def test_upload_no_file(client):
    resp = client.post('/upload', data={}, content_type='multipart/form-data')
    assert resp.status_code == 400

def test_health_check(client):
    resp = client.get('/')
    assert resp.status_code == 200
    assert b'ok' in resp.data
