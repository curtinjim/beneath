<?php
namespace App\AI\Providers;

use App\AI\BeneathAIProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnthropicProvider implements BeneathAIProvider
{
    private string $apiKey;
    private string $model;
    private string $baseUrl = 'https://api.anthropic.com/v1/messages';

    private const BETA_HEADERS = 'code-execution-2025-08-25,skills-2025-10-02,files-api-2025-04-14';

    private const DEFAULT_SKILL_IDS = [
        'maisie'                      => 'skill_01EcpNEmBbakHRMuqT3ERJQE',
        'pippa'                       => 'skill_01TbUbu8MWxRBNmvAH6CvTzR',
        'cate'                        => 'skill_01AcaSbRQhuaYnvuiEopmMpV',
        'lance'                       => 'skill_01VJLwsLmmwEu9B9aqB8fcmZ',
        'jack'                        => 'skill_01ANszmacPDDFmCrEocp8Rnk',
        'jackson'                     => 'skill_016WVYgWcCyHUkUX9wT88Ytj',
        'email-significance'          => 'skill_01Xmz4PhWcjKYUbzjLvo2JMF',
        'divergence-computation'      => 'skill_016ULhPd5up15Gqx86EAk2s8',
        'contradiction-detection'     => 'skill_01BzibLRWPZD4okxUzGevjdr',
        'news-summarisation'          => 'skill_01Gcr4d59eyTZc2XAnAQ5qw8',
        'entity-extraction'           => 'skill_01Q8bNH5nrGxn41r5RPTE8tB',
        'enrichment-field-generation' => 'skill_01Af6YJqW4hTj1KTHUSYtzFj',
        'leverage-read-suggestion'    => 'skill_01JhVxA483Eo2PNCuqFbwT6T',
        'actor-briefing'              => 'skill_01LGkRnY9Xt5ZfWWUBURRuRS',
        'narrative-synthesis'         => 'skill_01W87BsbQEQYWYaeEHNJfS3L',
        'distil-document-pipeline'    => 'skill_01UqDWjNYrvpB7pS1jMLm5cu',
        'pre-composition-briefing'    => 'skill_018jUyfCGchZbkR6QNyTFqHU',
    ];

    private array $skillIds;

    public function __construct(array $skillIds = [])
    {
        $this->apiKey   = config('ai.anthropic_api_key');
        $this->model    = config('ai.anthropic_model', 'claude-sonnet-4-6');
        $this->skillIds = !empty($skillIds) ? $skillIds : self::DEFAULT_SKILL_IDS;
    }

    private function skill(string $name): string
    {
        if (!isset($this->skillIds[$name])) {
            throw new \RuntimeException("No skill ID configured for: {$name}");
        }
        return $this->skillIds[$name];
    }

    // -------------------------------------------------------------------------
    // Skills API — single-turn, returns JSON
    // Retries twice on 529/overloaded with exponential backoff.
    // -------------------------------------------------------------------------
    private function callWithSkill(string $skillId, string $user, int $maxTokens = 1024): array
    {
        $attempt  = 0;
        $lastError = null;

        while ($attempt < 3) {
            if ($attempt > 0) {
                sleep((int) pow(2, $attempt));
            }

            $response = Http::withHeaders([
                'x-api-key'         => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'anthropic-beta'    => self::BETA_HEADERS,
                'content-type'      => 'application/json',
            ])->timeout(60)->post($this->baseUrl, [
                'model'      => $this->model,
                'max_tokens' => $maxTokens,
                'container'  => [
                    'skills' => [
                        ['type' => 'custom', 'skill_id' => $skillId],
                    ],
                ],
                'messages' => [
                    ['role' => 'user', 'content' => $user],
                ],
                'tools' => [
                    ['type' => 'code_execution_20250825', 'name' => 'code_execution'],
                ],
            ]);

            if ($response->status() === 529 || $response->json('type') === 'overloaded_error') {
                $attempt++;
                $lastError = 'overloaded';
                continue;
            }

            if (!$response->successful()) {
                Log::error('Anthropic Skills API error', [
                    'skill_id' => $skillId,
                    'status'   => $response->status(),
                    'body'     => $response->body(),
                ]);
                throw new \RuntimeException('Anthropic API error: ' . $response->status());
            }

            return $this->extractJsonFromResponse($response->json());
        }

        Log::error('Anthropic Skills API overloaded after retries', ['skill_id' => $skillId]);
        throw new \RuntimeException('Anthropic API overloaded: ' . $lastError);
    }

    // -------------------------------------------------------------------------
    // Skills API — multi-turn chat, returns raw text
    // -------------------------------------------------------------------------
    private function callChatWithSkill(string $skillId, array $messages, int $maxTokens = 4096): string
    {
        $response = Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'anthropic-beta'    => self::BETA_HEADERS,
            'content-type'      => 'application/json',
        ])->timeout(60)->post($this->baseUrl, [
            'model'      => $this->model,
            'max_tokens' => $maxTokens,
            'container'  => [
                'skills' => [
                    ['type' => 'custom', 'skill_id' => $skillId],
                ],
            ],
            'messages' => $messages,
            'tools'    => [
                ['type' => 'code_execution_20250825', 'name' => 'code_execution'],
            ],
        ]);

        if (!$response->successful()) {
            Log::error('Anthropic chat Skills API error', [
                'skill_id' => $skillId,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            throw new \RuntimeException('Anthropic API error: ' . $response->status());
        }

        return $this->extractTextFromResponse($response->json());
    }

    // -------------------------------------------------------------------------
    // Legacy — inline system prompt, used for methods without an uploaded skill.
    // Do NOT use for methods that have a skill ID.
    // -------------------------------------------------------------------------
    private function callLegacy(string $system, string $user, int $maxTokens = 1024): array
    {
        $response = Http::withHeaders([
            'x-api-key'         => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->timeout(30)->post($this->baseUrl, [
            'model'      => $this->model,
            'max_tokens' => $maxTokens,
            'system'     => $system,
            'messages'   => [['role' => 'user', 'content' => $user]],
        ]);

        if (!$response->successful()) {
            Log::error('Anthropic legacy API error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('Anthropic API error: ' . $response->status());
        }

        $text = $response->json('content.0.text', '');
        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/\s*```$/m', '', $text);

        $decoded = json_decode(trim($text), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Anthropic legacy parse failure', ['raw' => substr($text, 0, 500)]);
            throw new \RuntimeException('Failed to parse AI response as JSON');
        }

        return $decoded;
    }

    // -------------------------------------------------------------------------
    // Response parsing
    // The Skills API response content array contains multiple blocks.
    // Do not assume content[0] is text — scan for the first text block.
    // -------------------------------------------------------------------------
    private function extractTextFromResponse(array $responseData): string
    {
        $content = $responseData['content'] ?? [];
        foreach ($content as $block) {
            if (($block['type'] ?? '') === 'text') {
                return $block['text'] ?? '';
            }
        }
        Log::warning('No text block in Anthropic Skills response', [
            'content_types' => array_column($content, 'type'),
        ]);
        return '';
    }

    private function extractJsonFromResponse(array $responseData): array
    {
        $text = $this->extractTextFromResponse($responseData);

        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/\s*```$/m', '', $text);

        $decoded = json_decode(trim($text), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Anthropic Skills JSON parse failure', ['raw' => substr($text, 0, 500)]);
            throw new \RuntimeException('Failed to parse AI response as JSON');
        }

        return $decoded;
    }

    // -------------------------------------------------------------------------
    // Operation methods — Skills API
    // -------------------------------------------------------------------------

    public function assessEmailSignificance(array $thread, array $actors): array
    {
        $user = 'Analyse this email thread and return a JSON object matching the schema in your instructions. '
              . 'Thread: ' . json_encode($thread) . ' Actors: ' . json_encode($actors);
        try {
            return $this->callWithSkill($this->skill('email-significance'), $user, 800);
        } catch (\Throwable) {
            return ['suggestedEvents' => []];
        }
    }

    public function computeDivergence(array $events): array
    {
        $user = 'Analyse these behavioural events for divergence between stated positions and actions. '
              . 'Return JSON matching the schema in your instructions. Max 5 contributingPairs. Events: '
              . json_encode($events);
        try {
            return $this->callWithSkill($this->skill('divergence-computation'), $user, 1500);
        } catch (\Throwable) {
            return ['rating' => 'insufficientData', 'contributingPairs' => []];
        }
    }

    public function detectContradiction(array $newEvent, array $candidates): array
    {
        $user = 'Does the new event contradict any candidate event? Return JSON matching the schema in your instructions. '
              . 'New event: ' . json_encode($newEvent) . ' Candidates: ' . json_encode($candidates);
        try {
            return $this->callWithSkill($this->skill('contradiction-detection'), $user, 400);
        } catch (\Throwable) {
            return ['contradictionDetected' => false, 'contradictingEventId' => null, 'confidence' => null, 'explanation' => null];
        }
    }

    public function summariseNewsItem(string $headline, string $body, array $actorContext): array
    {
        $actorName = $actorContext['name'] ?? 'this actor';
        $user      = "Summarise this news item and its relevance to {$actorName}. Return JSON matching the schema in your instructions. "
                   . "Headline: {$headline}. Body: " . substr($body, 0, 2000);
        try {
            return $this->callWithSkill($this->skill('news-summarisation'), $user, 200);
        } catch (\Throwable) {
            return ['summary' => null];
        }
    }

    public function extractEntities(string $documentText, array $existingActors): array
    {
        $user = 'Extract named entities from this document. Return JSON matching the schema in your instructions. '
              . 'Max 20 candidates. Existing actors for matching: ' . json_encode(array_slice($existingActors, 0, 100))
              . ' Document: ' . substr($documentText, 0, 15000);
        try {
            return $this->callWithSkill($this->skill('entity-extraction'), $user, 2000);
        } catch (\Throwable) {
            return ['matchedActors' => [], 'candidateNewActors' => []];
        }
    }

    public function extractEvents(string $documentText, array $existingActors): array
    {
        $user = 'Extract behavioural events from this document. Return JSON with key "events" matching the schema in your instructions. '
              . 'Max 20 events. Known actors for attribution: ' . json_encode(array_slice($existingActors, 0, 50))
              . ' Document: ' . substr($documentText, 0, 15000);
        try {
            $result = $this->callWithSkill($this->skill('distil-document-pipeline'), $user, 3000);
            return ['events' => $result['events'] ?? []];
        } catch (\Throwable) {
            return ['events' => []];
        }
    }

    public function extractClaims(string $documentText, array $existingActors): array
    {
        $user = 'Extract significant claims from this document. Return JSON with key "claims" matching the schema in your instructions. '
              . 'Max 30 claims. Known actors: ' . json_encode(array_slice($existingActors, 0, 50))
              . ' Document: ' . substr($documentText, 0, 15000);
        try {
            $result = $this->callWithSkill($this->skill('distil-document-pipeline'), $user, 3000);
            return ['claims' => $result['claims'] ?? []];
        } catch (\Throwable) {
            return ['claims' => []];
        }
    }

    public function generateEnrichmentFields(array $inputData): array
    {
        $user = 'Generate enrichment field proposals from this source data. Return JSON matching the schema in your instructions. '
              . 'Do not propose fields already in operatorEnteredFields. Input: ' . json_encode($inputData);
        try {
            return $this->callWithSkill($this->skill('enrichment-field-generation'), $user, 600);
        } catch (\Throwable) {
            return ['proposedFields' => []];
        }
    }

    public function suggestLeverageRead(array $affiliationContext): array
    {
        $user = 'Suggest a leverage read for this affiliation. Return JSON matching the schema in your instructions. '
              . 'Context: ' . json_encode($affiliationContext);
        try {
            return $this->callWithSkill($this->skill('leverage-read-suggestion'), $user, 200);
        } catch (\Throwable) {
            return ['suggestedRead' => null, 'rationale' => null];
        }
    }

    public function synthesizeNarrative(array $projectContext, array $actorSummaries): array
    {
        $projectName = $projectContext['name'] ?? 'this project';
        $goal        = $projectContext['goal_statement'] ?? 'not specified';
        $user        = "Write an analytical narrative for {$projectName}. Project goal: {$goal}. "
                     . 'Synthesise the actor data below into a coherent intelligence picture. Return JSON matching the schema in your instructions. '
                     . 'Actor summaries: ' . json_encode($actorSummaries);
        try {
            return $this->callWithSkill($this->skill('narrative-synthesis'), $user, 2000);
        } catch (\Throwable) {
            return ['narrative' => null, 'key_themes' => [], 'confidence' => null];
        }
    }

    public function actorBriefing(array $actorData, array $events, array $relationships): array
    {
        $name = $actorData['display_name'] ?? 'this actor';
        $user = "Produce a full intelligence briefing for {$name}. Return JSON matching the schema in your instructions. "
              . 'Actor profile: ' . json_encode($actorData)
              . ' Recent events (last 30): ' . json_encode($events)
              . ' Relationships (top 20): ' . json_encode($relationships);
        try {
            return $this->callWithSkill($this->skill('actor-briefing'), $user, 3000);
        } catch (\Throwable) {
            return ['briefing' => null, 'key_themes' => [], 'confidence' => null];
        }
    }

    public function preCompositionBriefing(array $context): array
    {
        $user = 'Generate a pre-composition briefing from this context. Return JSON matching the schema in your instructions. '
              . 'Context: ' . json_encode($context);
        try {
            return $this->callWithSkill($this->skill('pre-composition-briefing'), $user, 2000);
        } catch (\Throwable) {
            return ['briefing' => null];
        }
    }

    // -------------------------------------------------------------------------
    // Legacy path — no skill uploaded yet; continue using inline system prompt.
    // -------------------------------------------------------------------------

    public function suggestGrade(array $eventData): array
    {
        $system = 'You are an intelligence analyst. Assess the reliability of a behavioural event based on its source type, corroboration, and content characteristics. Return only valid JSON — no markdown.';
        $user   = 'Suggest a reliability grade for this event. Return JSON: {"suggestedGrade":"bedrock|rock|sand|mud|fog","rationale":"string max 150 chars","confidence":"high|medium|low"}. Grade definitions: bedrock=verified by multiple independent primary sources, rock=single primary source of high credibility, sand=secondary source or unverified primary, mud=rumour or single uncorroborated source, fog=speculation or unverifiable. Event data: ' . json_encode($eventData);
        try {
            return $this->callLegacy($system, $user, 300);
        } catch (\Throwable) {
            return ['suggestedGrade' => null, 'rationale' => null, 'confidence' => null];
        }
    }

    public function computeTrajectory(array $events, array $actorContext): array
    {
        $name   = $actorContext['display_name'] ?? 'this actor';
        $system = 'You are an intelligence analyst assessing a contact\'s trajectory over time based on their behavioural record. Return only valid JSON — no markdown.';
        $user   = "Assess the trajectory of {$name} based on these events in chronological order. Return JSON: {\"trajectory\":\"ascending|stable|declining|unclear\",\"rationale\":\"string max 200 chars\",\"confidence\":\"high|medium|low\"}. Events (chronological): " . json_encode($events);
        try {
            return $this->callLegacy($system, $user, 400);
        } catch (\Throwable) {
            return ['trajectory' => null, 'rationale' => null, 'confidence' => null];
        }
    }

    public function assessSplit(array $events, array $actorContext): array
    {
        $name   = $actorContext['display_name'] ?? 'this actor';
        $system = 'You are an intelligence analyst assessing whether a single actor record may contain data belonging to two or more distinct individuals. Return only valid JSON — no markdown.';
        $user   = "Does this record for {$name} show signs of being two or more distinct individuals? Return JSON: {\"split_suggested\":bool,\"rationale\":\"string max 250 chars\",\"confidence\":\"high|medium|low\"}. Events (chronological): " . json_encode($events);
        try {
            return $this->callLegacy($system, $user, 400);
        } catch (\Throwable) {
            return ['split_suggested' => false, 'rationale' => null, 'confidence' => null];
        }
    }

    public function assessCanary(array $events, array $actorContext): array
    {
        $name   = $actorContext['display_name'] ?? 'this actor';
        $system = 'You are an intelligence analyst assessing whether an actor is a suitable candidate for a canary operation. Return only valid JSON — no markdown.';
        $user   = "Assess whether {$name} is a suitable canary candidate. Return JSON: {\"canary_recommended\":bool,\"rationale\":\"string max 250 chars\",\"confidence\":\"high|medium|low\"}. Actor context: " . json_encode($actorContext) . ' Events: ' . json_encode($events);
        try {
            return $this->callLegacy($system, $user, 400);
        } catch (\Throwable) {
            return ['canary_recommended' => false, 'rationale' => null, 'confidence' => null];
        }
    }

    public function scoreSignalRelevance(array $signal, string $goalStatement): array
    {
        $system = 'You are an intelligence analyst scoring how relevant a harvested signal is to a specific project goal. Return only valid JSON — no markdown.';
        $user   = "Score the relevance of this signal to the project goal. Return JSON: {\"score\":integer 0-100,\"note\":\"string max 150 chars\"}. Score 0=completely irrelevant, 50=tangentially relevant, 100=directly addresses goal. Project goal: {$goalStatement}. Signal: " . json_encode($signal);
        try {
            return $this->callLegacy($system, $user, 150);
        } catch (\Throwable) {
            return ['score' => 0, 'note' => null];
        }
    }

    // -------------------------------------------------------------------------
    // Chat — multi-turn persona sessions (BD-125)
    // -------------------------------------------------------------------------

    public function chat(array $messages, string $skillId, int $maxTokens = 4096): string
    {
        try {
            return $this->callChatWithSkill($skillId, $messages, $maxTokens);
        } catch (\Throwable $e) {
            Log::error('Chat session error', ['skill_id' => $skillId, 'error' => $e->getMessage()]);
            throw $e;
        }
    }
}
