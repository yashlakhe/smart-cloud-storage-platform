import io
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.main import app
from app.models.user import User

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert data["services"]["backend"] == "running"
    assert data["services"]["database"] == "connected"


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Smart Cloud Storage Platform"


def test_openapi_schema():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    assert "/auth/login" in schema["paths"]
    assert "/files/upload" in schema["paths"]
    assert "/folders/" in schema["paths"]
    assert "/shares/" in schema["paths"]


def test_auth_and_user_lifecycle():
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"user_{unique_suffix}@example.com"
    password = "StrongPassword123!"
    full_name = f"Test User {unique_suffix}"

    # 1. Valid Registration
    reg_res = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == email.lower()
    assert user_data["full_name"] == full_name
    assert "password_hash" not in user_data
    assert "password" not in user_data

    # 2. Duplicate Registration Rejection
    dup_res = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert dup_res.status_code == 409

    # 3. Invalid Login (wrong password)
    bad_login = client.post(
        "/auth/login",
        json={"email": email, "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401
    assert "Invalid email or password" in bad_login.json()["detail"]

    # 4. Invalid Login (nonexistent user)
    non_user_login = client.post(
        "/auth/login",
        json={"email": f"nonexistent_{unique_suffix}@example.com", "password": password},
    )
    assert non_user_login.status_code == 401
    assert "Invalid email or password" in non_user_login.json()["detail"]

    # 5. Successful Login
    login_res = client.post(
        "/auth/login",
        json={"email": email.upper(), "password": password},  # test email normalization
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert "password_hash" not in token_data["user"]
    token = token_data["access_token"]

    # 6. Unauthenticated /auth/me rejected
    unauth_me = client.get("/auth/me")
    assert unauth_me.status_code == 401

    # 7. Authenticated /auth/me
    auth_headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/auth/me", headers=auth_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email.lower()

    # 8. /users/me alias
    users_me_res = client.get("/users/me", headers=auth_headers)
    assert users_me_res.status_code == 200
    assert users_me_res.json()["id"] == me_res.json()["id"]

    # 9. Inactive User Handling
    with SessionLocal() as db:
        db_user = db.execute(select(User).where(User.email == email.lower())).scalar_one()
        db_user.is_active = False
        db.commit()

    # Inactive login rejected
    inactive_login = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert inactive_login.status_code == 401
    assert "inactive" in inactive_login.json()["detail"].lower()

    # Inactive token usage on protected route rejected
    inactive_me = client.get("/auth/me", headers=auth_headers)
    assert inactive_me.status_code == 401


def test_folders_and_files_workflow():
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"alice_{unique_suffix}@example.com"
    password = "SecurePassword123!"
    full_name = "Alice User"

    client.post("/auth/register", json={"email": email, "password": password, "full_name": full_name})
    login_res = client.post("/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Folder
    f_res = client.post("/folders/", json={"name": "Documents"}, headers=headers)
    assert f_res.status_code == 201
    folder = f_res.json()
    folder_id = folder["id"]
    assert folder["name"] == "Documents"

    # 2. Create Subfolder
    sub_res = client.post(
        "/folders/",
        json={"name": "Invoices", "parent_folder_id": folder_id},
        headers=headers,
    )
    assert sub_res.status_code == 201
    subfolder = sub_res.json()
    assert subfolder["parent_folder_id"] == folder_id

    # 3. List Folders
    list_f = client.get("/folders/", headers=headers)
    assert list_f.status_code == 200
    root_folders = list_f.json()
    assert any(f["id"] == folder_id for f in root_folders)

    # 4. Upload File to Folder
    sample_content = b"Hello Cloud Storage! This is a test invoice."
    upload_res = client.post(
        "/files/upload",
        files={"file": ("invoice_august.txt", io.BytesIO(sample_content), "text/plain")},
        data={"folder_id": subfolder["id"]},
        headers=headers,
    )
    assert upload_res.status_code == 201
    file_info = upload_res.json()
    file_id = file_info["id"]
    assert file_info["original_filename"] == "invoice_august.txt"
    assert file_info["size"] == len(sample_content)
    assert file_info["folder_id"] == subfolder["id"]
    assert "users/" in file_info["storage_key"]

    # 5. List Files in Subfolder
    list_files_res = client.get(f"/files/?folder_id={subfolder['id']}", headers=headers)
    assert list_files_res.status_code == 200
    files_in_sub = list_files_res.json()
    assert len(files_in_sub) == 1
    assert files_in_sub[0]["id"] == file_id

    # 6. Search Files
    search_res = client.get("/files/?q=invoice", headers=headers)
    assert search_res.status_code == 200
    search_results = search_res.json()
    assert any(f["id"] == file_id for f in search_results)

    # 7. Get File Metadata
    meta_res = client.get(f"/files/{file_id}", headers=headers)
    assert meta_res.status_code == 200
    assert meta_res.json()["id"] == file_id

    # 8. Download / Stream File
    stream_res = client.get(f"/files/{file_id}/stream", headers=headers)
    assert stream_res.status_code == 200
    assert stream_res.content == sample_content

    # 9. Storage Stats
    stats_res = client.get("/files/stats/summary", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_files"] >= 1
    assert stats["total_folders"] >= 2
    assert stats["total_bytes_used"] >= len(sample_content)

    # 10. Rename File
    rename_res = client.put(
        f"/files/{file_id}",
        json={"original_filename": "renamed_invoice.txt"},
        headers=headers,
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["original_filename"] == "renamed_invoice.txt"

    # 11. Delete File
    del_res = client.delete(f"/files/{file_id}", headers=headers)
    assert del_res.status_code == 204

    # 12. Confirm Deletion
    get_del_res = client.get(f"/files/{file_id}", headers=headers)
    assert get_del_res.status_code == 404


def test_file_sharing_and_access_control_e2e():
    suffix = uuid.uuid4().hex[:8]
    alice_email = f"alice_share_{suffix}@example.com"
    bob_email = f"bob_share_{suffix}@example.com"
    charlie_email = f"charlie_share_{suffix}@example.com"
    password = "SharedPassword123!"

    # Register Alice, Bob, Charlie
    client.post("/auth/register", json={"email": alice_email, "password": password, "full_name": "Alice Share"})
    client.post("/auth/register", json={"email": bob_email, "password": password, "full_name": "Bob Share"})
    client.post("/auth/register", json={"email": charlie_email, "password": password, "full_name": "Charlie Share"})

    alice_token = client.post("/auth/login", json={"email": alice_email, "password": password}).json()["access_token"]
    bob_token = client.post("/auth/login", json={"email": bob_email, "password": password}).json()["access_token"]
    charlie_token = client.post("/auth/login", json={"email": charlie_email, "password": password}).json()["access_token"]

    alice_h = {"Authorization": f"Bearer {alice_token}"}
    bob_h = {"Authorization": f"Bearer {bob_token}"}
    charlie_h = {"Authorization": f"Bearer {charlie_token}"}

    # Alice uploads a secret file
    secret_bytes = b"CONFIDENTIAL PROJECT BLUEPRINT - DO NOT DISTRIBUTE"
    upload_res = client.post(
        "/files/upload",
        files={"file": ("blueprint.pdf", io.BytesIO(secret_bytes), "application/pdf")},
        headers=alice_h,
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    # Bob attempts to access Alice's file before sharing -> REJECTED (404/access denied)
    bob_unauth_stream = client.get(f"/files/{file_id}/stream", headers=bob_h)
    assert bob_unauth_stream.status_code == 404

    # Alice shares file with Bob
    share_res = client.post(
        "/shares/",
        json={"file_id": file_id, "recipient_email": bob_email, "permission": "read"},
        headers=alice_h,
    )
    assert share_res.status_code == 201
    share_data = share_res.json()
    share_id = share_data["id"]
    assert share_data["permission"] == "read"

    # Bob checks shared-with-me list -> File is visible
    bob_shared_list = client.get("/shares/shared-with-me", headers=bob_h)
    assert bob_shared_list.status_code == 200
    shared_items = bob_shared_list.json()
    assert any(item["file"]["id"] == file_id for item in shared_items)

    # Bob downloads Alice's shared file -> SUCCESS
    bob_stream = client.get(f"/files/{file_id}/stream", headers=bob_h)
    assert bob_stream.status_code == 200
    assert bob_stream.content == secret_bytes

    # Charlie (3rd party) attempts to access file -> REJECTED
    charlie_stream = client.get(f"/files/{file_id}/stream", headers=charlie_h)
    assert charlie_stream.status_code == 404

    # Bob attempts to delete Alice's file -> REJECTED (only owner can delete)
    bob_delete = client.delete(f"/files/{file_id}", headers=bob_h)
    assert bob_delete.status_code == 404

    # Alice revokes Bob's share
    revoke_res = client.delete(f"/shares/{share_id}", headers=alice_h)
    assert revoke_res.status_code == 204

    # Bob attempts to download again -> REJECTED
    bob_stream_revoked = client.get(f"/files/{file_id}/stream", headers=bob_h)
    assert bob_stream_revoked.status_code == 404
