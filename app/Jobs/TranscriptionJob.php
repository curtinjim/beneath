<?php

namespace App\Jobs;

use App\Models\Source;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TranscriptionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 300;

    public function __construct(public readonly string $sourceId) {}

    public function handle(): void
    {
        $source = Source::find($this->sourceId);
        if (!$source) return;

        $source->update(['status' => 'processing']);

        $apiKey = config('services.openai.key');
        if (!$apiKey) {
            $source->update(['status' => 'failed', 'distil_error' => 'OpenAI API key not configured.']);
            return;
        }

        $path = $source->file_path;
        if (!$path || !Storage::exists($path)) {
            $source->update(['status' => 'failed', 'distil_error' => 'Audio file not found.']);
            return;
        }

        $absolutePath = Storage::path($path);
        $fileName     = basename($path);

        try {
            $response = Http::timeout(270)
                ->withToken($apiKey)
                ->attach('file', file_get_contents($absolutePath), $fileName)
                ->post('https://api.openai.com/v1/audio/transcriptions', [
                    'model'           => 'whisper-1',
                    'response_format' => 'text',
                ]);

            if (!$response->successful()) {
                $error = $response->json('error.message') ?? 'Transcription failed (HTTP ' . $response->status() . ')';
                $source->update(['status' => 'failed', 'distil_error' => $error]);
                return;
            }

            $transcript = trim($response->body());

            if (empty($transcript)) {
                $source->update(['status' => 'done', 'distil_status' => 'skipped', 'raw_text' => '']);
                return;
            }

            $source->update([
                'raw_text'      => $transcript,
                'status'        => 'done',
                'distil_status' => 'pending',
            ]);

            DistilProcessJob::dispatch($source->id);

        } catch (\Throwable $e) {
            Log::error('TranscriptionJob failed', ['source_id' => $this->sourceId, 'error' => $e->getMessage()]);
            $source->update(['status' => 'failed', 'distil_error' => 'Transcription error: ' . $e->getMessage()]);
        }
    }
}
