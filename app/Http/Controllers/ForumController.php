<?php

namespace App\Http\Controllers;

use App\Models\ForumComment;
use App\Models\ForumThread;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class ForumController extends Controller
{
    public function index(): View
    {
        return view('forum', ['threads' => ForumThread::query()->withCount('comments')->latest('created_at')->get()]);
        return view('forum', ['threads' => ForumThread::query()->with('comments')->withCount('comments')->latest('created_at')->get()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['title' => ['required', 'string'], 'message' => ['required', 'string']]);
        ForumThread::create(['user_id' => $request->user()->id, 'author' => $request->user()->username, ...$data]);
        return back()->with('success', 'Thread berhasil dibuat!');
    }

    public function comment(Request $request, ForumThread $thread): RedirectResponse
    {
        $data = $request->validate(['comment' => ['required', 'string']]);
        ForumComment::create(['thread_id' => $thread->id, 'user_id' => $request->user()->id, 'author' => $request->user()->username, 'message' => $data['comment']]);
        return back()->with('success', 'Komentar berhasil ditambahkan!');
    }

    public function destroy(Request $request, ForumThread $thread): RedirectResponse
    {
        abort_unless($request->user()->role === 'admin' || $thread->user_id === $request->user()->id, 403);
        $thread->delete();
        return back()->with('success', 'Thread berhasil dihapus!');
    }

    public function destroyComment(Request $request, ForumComment $comment): RedirectResponse
    {
        abort_unless($request->user()->role === 'admin' || $comment->user_id === $request->user()->id, 403);
        $comment->delete();
        return back()->with('success', 'Komentar berhasil dihapus!');
    }
}
