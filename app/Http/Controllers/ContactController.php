<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class ContactController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string'], 'email' => ['required', 'email'], 'phone' => ['nullable', 'string'],
            'subject' => ['required', 'string'], 'message' => ['required', 'string'],
        ], ['required' => 'Semua field harus diisi (email dan telepon opsional).']);
        $email = strtolower($data['email']);
        $tooMany = ContactAttempt::query()->where('email', $email)->where('created_at', '>=', Carbon::now()->subMinutes(5))->count() >= 3;
        if ($tooMany) return response()->json(['success' => false, 'message' => 'Anda sudah terlalu sering mengirim pesan. Coba lagi dalam beberapa menit ke depan.']);
        ContactAttempt::create(['email' => $email]);
        Contact::create([...$data, 'status' => 'unread']);
        return response()->json(['success' => true, 'message' => 'Kontak Anda berhasil dikirim! Admin akan segera membalas.']);
    }
}
