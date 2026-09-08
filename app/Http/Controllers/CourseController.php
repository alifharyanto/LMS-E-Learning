<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Models\StudySession;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\View\View;

class CourseController extends Controller
{
    public function index(Request $request): View
    {
        StudySession::create(['user_id' => $request->user()->id, 'page_name' => 'courses', 'minutes_spent' => 1]);
        $materials = Material::query()->latest('created_at')->get();

        return view('courses', compact('materials'));
    }

    public function pdf(Request $request, int $id): Response
    {
        $material = Material::query()->find($id);
        $relativePath = $material?->file_path;
        $root = realpath(public_path('Materi'));
        $path = $relativePath ? realpath(public_path($relativePath)) : false;

        abort_unless($material && $root && $path && Str::startsWith($path, $root . DIRECTORY_SEPARATOR) && is_file($path), 404, 'File materi tidak tersedia.');
        abort_unless(strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'pdf', 415, 'File materi bukan PDF.');

        return response()->view('pdf-viewer', [
            'material' => $material,
            'pdfBase64' => base64_encode((string) file_get_contents($path)),
        ]);
    }
}
