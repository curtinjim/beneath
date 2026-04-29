<?php
namespace App\AI;

interface BeneathAIProvider
{
    public function assessEmailSignificance(array $thread, array $actors): array;
    public function computeDivergence(array $events): array;
    public function detectContradiction(array $newEvent, array $candidates): array;
    public function summariseNewsItem(string $headline, string $body, array $actorContext): array;
    public function extractEntities(string $documentText, array $existingActors): array;
    public function extractEvents(string $documentText, array $existingActors): array;
    public function extractClaims(string $documentText, array $existingActors): array;
    public function generateEnrichmentFields(array $inputData): array;
    public function suggestLeverageRead(array $affiliationContext): array;
    public function suggestGrade(array $eventData): array;
    public function computeTrajectory(array $events, array $actorContext): array;
    public function chat(array $messages, string $skillId, int $maxTokens = 4096): string;
    public function assessSplit(array $events, array $actorContext): array;
    public function assessCanary(array $events, array $actorContext): array;
    public function synthesizeNarrative(array $projectContext, array $actorSummaries): array;
    public function scoreSignalRelevance(array $signal, string $goalStatement): array;
    public function actorBriefing(array $actorData, array $events, array $relationships): array;      // BD-126
    public function preCompositionBriefing(array $context): array;                                    // BD-126
}
