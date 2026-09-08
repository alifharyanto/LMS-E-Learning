@extends('layouts.app', ['title' => 'Forum | CourseUp'])
@section('content')
<section class="mb-8 text-center"><span class="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Forum</span><h1 class="mt-4 text-4xl font-black">Belajar bersama dan berdiskusi</h1><p class="mt-3 text-lg text-slate-600">Tanyakan pertanyaan dan berbagi pengetahuan.</p></section>
<div class="grid gap-8 lg:grid-cols-[340px_1fr]">
@auth
<div class="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm"><h2 class="text-xl font-black">Thread Baru</h2><form method="post" action="{{ route('forum.threads.store') }}" class="mt-5 space-y-4">@csrf<input name="title" required class="w-full rounded-xl border p-3" placeholder="Judul topik"><textarea name="message" required class="w-full rounded-xl border p-3" rows="5" placeholder="Pesan"></textarea><button class="w-full rounded-full bg-emerald-600 px-4 py-3 text-white">Kirim Diskusi</button></form></div>
@else
<div class="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">Silakan <a class="text-emerald-700" href="{{ route('login') }}">login</a> untuk membuat thread.</div>
@endauth
<div class="space-y-5">
@forelse($threads as $thread)
<article class="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm"><div class="flex items-start justify-between gap-4"><div><h2 class="text-xl font-bold">{{ $thread->title }}</h2><p class="mt-1 text-xs text-slate-500">oleh {{ $thread->author }} · {{ $thread->comment_count }} komentar</p></div>@auth @if(auth()->user()->role === 'admin' || auth()->id() === $thread->user_id)<form method="post" action="{{ route('forum.threads.destroy', $thread) }}">@csrf @method('delete')<button class="text-sm text-red-600">Hapus</button></form>@endif @endauth</div><p class="mt-4 whitespace-pre-line text-slate-700">{{ $thread->message }}</p>
@if($thread->comments->isNotEmpty())<div class="mt-5 space-y-3 border-t pt-4">@foreach($thread->comments as $comment)<div class="rounded-xl bg-emerald-50 p-3"><div class="flex justify-between gap-3"><b>{{ $comment->author }}</b>@auth @if(auth()->user()->role === 'admin' || auth()->id() === $comment->user_id)<form method="post" action="{{ route('forum.comments.destroy', $comment) }}">@csrf @method('delete')<button class="text-xs text-red-600">Hapus</button></form>@endif @endauth</div><p class="mt-1 text-slate-700">{{ $comment->message }}</p></div>@endforeach</div>@endif
@auth<form method="post" action="{{ route('forum.comments.store', $thread) }}" class="mt-5 flex gap-2">@csrf<input name="comment" required class="min-w-0 flex-1 rounded-xl border p-2" placeholder="Tulis komentar"><button class="rounded-xl bg-emerald-600 px-4 text-white">Kirim</button></form>@endauth</article>
@empty<p class="text-center text-slate-500">Belum ada thread. Jadilah yang pertama.</p>
@endforelse
</div></div>
@endsection
