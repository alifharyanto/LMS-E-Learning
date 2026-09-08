<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Daftar | CourseUp</title></head><body>
<main style="max-width:420px;margin:60px auto;font-family:Arial,sans-serif"><h1>Buat akun CourseUp</h1>
@if ($errors->any())<div style="color:#b42318">{{ $errors->first() }}</div>@endif
<form method="post" action="{{ route('register.store') }}">@csrf
<label>Username</label><input name="username" value="{{ old('username') }}" required style="display:block;width:100%;margin:8px 0 16px;padding:10px">
<label>Email</label><input name="email" type="email" value="{{ old('email') }}" required style="display:block;width:100%;margin:8px 0 16px;padding:10px">
<label>Password</label><input name="password" type="password" required style="display:block;width:100%;margin:8px 0 16px;padding:10px">
<button type="submit">Daftar sekarang</button></form><p>Sudah punya akun? <a href="{{ route('login') }}">Masuk</a></p><p><a href="{{ route('home') }}">Kembali</a></p></main></body></html>
