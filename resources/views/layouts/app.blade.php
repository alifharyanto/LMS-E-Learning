<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}"><title>{{ $title ?? 'CourseUp' }}</title>
<script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={theme:{extend:{colors:{ocean:{50:'#f0fdfa',100:'#ccfbf1',600:'#0d9488',700:'#0f766e'},emerald:{600:'#16a34a',700:'#15803d'}}}}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><link rel="stylesheet" href="{{ asset('styles.css') }}">
</head>
<body data-page="{{ request()->route()?->getName() }}" class="bg-gradient-to-b from-slate-50 to-emerald-50 text-slate-900 antialiased">
<header id="navbar" class="sticky top-0 z-40 border-b border-emerald-300/30 bg-white/80 backdrop-blur-md"><nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
<a href="{{ route('home') }}" class="flex items-center gap-3 group"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-700 to-emerald-600 text-lg font-black text-white shadow-lg">C</span><span class="text-2xl font-black tracking-tight"><span class="text-ocean-700">Course</span><span class="text-emerald-600">Up</span></span></a>
<div class="hidden items-center gap-7 text-sm font-medium text-slate-700 md:flex"><a href="{{ route('home') }}" class="hover:text-emerald-600">Beranda</a><a href="{{ route('courses') }}" class="hover:text-emerald-600">Kursus Materi</a><a href="{{ route('quiz') }}" class="hover:text-emerald-600">Latihan Soal</a><a href="{{ route('forum') }}" class="hover:text-emerald-600">Forum</a><a href="{{ route('help') }}" class="hover:text-emerald-600">Help Center</a></div>
<div class="flex items-center gap-3">@auth<a href="{{ auth()->user()->role === 'admin' ? route('admin') : route('dashboard') }}" class="rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">{{ auth()->user()->role === 'admin' ? 'Panel Admin' : 'Dashboard' }}</a><form method="post" action="{{ route('logout') }}">@csrf<button class="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Keluar</button></form>@else<a href="{{ route('login') }}" class="text-sm font-semibold text-emerald-700">Masuk</a><a href="{{ route('register') }}" class="rounded-full bg-gradient-to-r from-ocean-700 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">Daftar</a>@endauth</div>
</nav></header>
<main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">@if(session('success'))<div class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{{ session('success') }}</div>@endif @if($errors->any())<div class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ $errors->first() }}</div>@endif @yield('content')</main>
<script src="{{ asset('app.js') }}"></script>
</body></html>
