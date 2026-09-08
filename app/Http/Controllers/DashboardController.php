<?php

namespace App\Http\Controllers;

use App\Models\ForumThread;
use App\Models\QuizResult;
use App\Models\StudySession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();
        return view('dashboard', [
            'user' => $user, 'results' => QuizResult::where('user_id', $user->id)->latest('created_at')->get(),
            'average' => round((float) QuizResult::where('user_id', $user->id)->avg('percent')), 'threads' => ForumThread::where('user_id', $user->id)->count(),
            'minutes' => (int) StudySession::where('user_id', $user->id)->sum('minutes_spent'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate(['full_name' => ['required', 'string'], 'email' => ['required', 'email', 'unique:users,email,'.$request->user()->id], 'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']]);
        if ($request->hasFile('profile_photo')) {
            $file = $request->file('profile_photo');
            $name = 'user_'.$request->user()->id.'_'.time().'.'.$file->extension();
            $file->move(public_path('uploads/profiles'), $name);
            $data['profile_photo'] = 'uploads/profiles/'.$name;
        }
        $request->user()->update($data);
        return back()->with('success', 'Profil berhasil diperbarui.');
    }
}