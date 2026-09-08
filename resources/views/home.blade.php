@extends('layouts.app', ['title' => 'CourseUp | LMS Modern'])
@section('content')
<section class="rounded-[32px] bg-gradient-to-br from-slate-900 via-ocean-800 to-emerald-800 px-8 py-20 text-white shadow-xl">
    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Platform belajar modern</p>
    <h1 class="mt-5 max-w-3xl text-5xl font-black leading-tight">Tingkatkan potensi belajar Anda dengan CourseUp.</h1>
    <p class="mt-5 max-w-2xl text-lg text-emerald-100">Materi PDF, latihan soal, forum diskusi, dan dashboard progres dalam satu platform.</p>
    <div class="mt-8 flex flex-wrap gap-4"><a href="{{ route('courses') }}" class="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white">Mulai Belajar</a><a href="{{ route('forum') }}" class="rounded-full border border-emerald-300 px-6 py-3 font-semibold text-white">Buka Forum</a></div>
</section>
<section class="mt-12"><h2 class="text-3xl font-black">Pertanyaan yang sering ditanyakan</h2><div class="mt-6 grid gap-4 md:grid-cols-2">@forelse($faqs as $faq)<details class="rounded-2xl border border-emerald-200 bg-white p-5"><summary class="cursor-pointer font-bold">{{ $faq->question }}</summary><p class="mt-3 text-slate-600">{{ $faq->answer }}</p></details>@empty<p>Belum ada FAQ tersedia.</p>@endforelse</div></section>
@endsection
