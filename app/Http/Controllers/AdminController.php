<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Faq;
use App\Models\Material;
use App\Models\QuizCategory;
use App\Models\QuizQuestion;
use App\Models\QuizResult;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class AdminController extends Controller
{
    public function index(): View
    {
        return view('admin', [
            'materials' => Material::latest('created_at')->get(),
            'contacts' => Contact::latest('created_at')->get(),
            'categories' => QuizCategory::withCount('questions')->orderBy('name')->get(),
            'questions' => QuizQuestion::latest('created_at')->get(),
            'results' => QuizResult::with('user')->latest('created_at')->get(),
            'faqs' => Faq::latest('created_at')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['title' => ['required', 'string'], 'description' => ['nullable', 'string'], 'category' => ['required', 'string'], 'material_file' => ['required', 'file', 'mimes:pdf']]);
        $file = $request->file('material_file');
        $name = time().'_'.bin2hex(random_bytes(4)).'_'.preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
        $file->move(public_path('Materi'), $name);
        Material::create(['title' => $data['title'], 'description' => $data['description'] ?? '', 'category' => $data['category'], 'file_path' => 'Materi/'.$name, 'file_size' => filesize(public_path('Materi/'.$name)), 'file_type' => 'application/pdf']);
        return back()->with('success', 'Materi berhasil ditambahkan!');
    }

    public function destroyMaterial(Material $material): RedirectResponse
    {
        $path = realpath(public_path($material->file_path ?? ''));
        $root = realpath(public_path('Materi'));
        if ($path && $root && str_starts_with($path, $root . DIRECTORY_SEPARATOR) && is_file($path)) unlink($path);
        $material->delete();
        return back()->with('success', 'Materi berhasil dihapus!');
    }

    public function category(Request $request): RedirectResponse
    {
        $data = $request->validate(['category_name' => ['required', 'string', 'max:150'], 'parent_id' => ['nullable', 'integer']]);
        QuizCategory::create(['name' => $data['category_name'], 'parent_id' => $data['parent_id'] ?? null]);
        return back()->with('success', 'Kategori quiz berhasil ditambahkan!');
    }

    public function destroyCategory(QuizCategory $category): RedirectResponse
    {
        $category->delete();
        return back()->with('success', 'Kategori quiz berhasil dihapus!');
    }

    public function question(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category_id' => ['nullable', 'integer'], 'question' => ['required', 'string'],
            'option_a' => ['required', 'string'], 'option_b' => ['required', 'string'],
            'option_c' => ['required', 'string'], 'option_d' => ['required', 'string'],
            'answer_index' => ['required', 'integer', 'between:0,3'], 'explanation' => ['nullable', 'string'],
        ]);
        QuizQuestion::create($data);
        return back()->with('success', 'Soal berhasil ditambahkan!');
    }

    public function destroyQuestion(QuizQuestion $question): RedirectResponse
    {
        $question->delete();
        return back()->with('success', 'Soal berhasil dihapus!');
    }

    public function destroyResult(QuizResult $result): RedirectResponse
    {
        $result->delete();
        return back()->with('success', 'Riwayat skor berhasil dihapus!');
    }

    public function faq(Request $request): RedirectResponse
    {
        $data = $request->validate(['faq_question' => ['required', 'string'], 'faq_answer' => ['required', 'string']]);
        Faq::create(['question' => $data['faq_question'], 'answer' => $data['faq_answer']]);
        return back()->with('success', 'FAQ berhasil ditambahkan!');
    }

    public function updateFaq(Request $request, Faq $faq): RedirectResponse
    {
        $data = $request->validate(['faq_question' => ['required', 'string'], 'faq_answer' => ['required', 'string']]);
        $faq->update(['question' => $data['faq_question'], 'answer' => $data['faq_answer']]);
        return back()->with('success', 'FAQ berhasil diperbarui!');
    }

    public function destroyFaq(Faq $faq): RedirectResponse
    {
        $faq->delete();
        return back()->with('success', 'FAQ berhasil dihapus!');
    }

    public function markContactRead(Contact $contact): RedirectResponse
    {
        $contact->update(['status' => 'read']);
        return back()->with('success', 'Kontak ditandai sudah dibaca.');
    }

    public function destroyContact(Contact $contact): RedirectResponse
    {
        $contact->delete();
        return back()->with('success', 'Kontak berhasil dihapus!');
    }
}