<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Masuk | CourseUp</title></head><body>
<main style="max-width:420px;margin:60px auto;font-family:Arial,sans-serif"><h1>Masuk ke CourseUp</h1>
@if ($errors->any())<div style="color:#b42318">{{ $errors->first() }}</div>@endif
<form method="post" action="{{ route('login.store') }}">@csrf
<label>Username atau Email</label><input name="identity" value="{{ old('identity') }}" required style="display:block;width:100%;margin:8px 0 16px;padding:10px">
<label>Password</label><input name="password" type="password" required style="display:block;width:100%;margin:8px 0 16px;padding:10px">
<button type="submit">Masuk</button></form><p>Belum punya akun? <a href="{{ route('register') }}">Daftar</a></p><p><a href="{{ route('home') }}">Kembali</a></p></main></body></html>
