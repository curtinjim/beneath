<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        $now = now();
        DB::table('system_prompts')->insert([
            // B-group: background operations
            [
                'name'        => 'b1_email',
                'group'       => 'background',
                'label'       => 'B1 — Email significance',
                'description' => 'Identifies intelligence-significant events in email threads',
                'body'        => 'You are an intelligence analyst. Identify behavioural events of intelligence significance in emails. An event is significant if it contains a commitment, admission, denial, claim, or actionable position. Routine scheduling and pleasantries are not significant. Return only valid JSON — no markdown, no explanation.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'b2_divergence',
                'group'       => 'background',
                'label'       => 'B2 — Divergence computation',
                'description' => 'Assesses gap between stated positions and actions',
                'body'        => 'You are an intelligence analyst assessing whether an actor\'s stated positions diverge from their actions. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'b3_contradiction',
                'group'       => 'background',
                'label'       => 'B3 — Contradiction detection',
                'description' => 'Detects contradictions between actor statements',
                'body'        => 'You are an intelligence analyst detecting contradictions between actor statements. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'b4_news',
                'group'       => 'background',
                'label'       => 'B4 — News item summarisation',
                'description' => 'Concise two-sentence summary of news items',
                'body'        => 'You are a concise intelligence analyst. Write exactly two sentences. No editorialising. No speculation. State only what the article reports. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'b5_entities',
                'group'       => 'background',
                'label'       => 'B5 — Entity extraction',
                'description' => 'Extracts named persons, organisations, and government bodies',
                'body'        => 'You are an entity extraction specialist. Identify named persons, organisations, and government bodies. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'b6_enrichment',
                'group'       => 'background',
                'label'       => 'B6 — Enrichment field generation',
                'description' => 'Structures raw source data into clean record fields',
                'body'        => 'You are a CRM data enrichment specialist. Structure raw source data into clean record fields. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'b7_leverage',
                'group'       => 'background',
                'label'       => 'B7 — Leverage read suggestion',
                'description' => 'Suggests leverage read classification based on affiliation context',
                'body'        => 'You are an intelligence analyst. Based on affiliation context, suggest the most appropriate leverage read classification. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'b_grade',
                'group'       => 'background',
                'label'       => 'B — Reliability grade suggestion',
                'description' => 'Assesses reliability of a behavioural event',
                'body'        => 'You are an intelligence analyst. Assess the reliability of a behavioural event based on its source type, corroboration, and content characteristics. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'b_trajectory',
                'group'       => 'background',
                'label'       => 'B — Trajectory computation',
                'description' => 'Assesses actor trajectory from behavioural record',
                'body'        => 'You are an intelligence analyst assessing a contact\'s trajectory over time based on their behavioural record. Trajectory is the direction of their influence, reliability, and activity trend. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],

            // C-group: synthesis operations
            [
                'name'        => 'c1_actor_briefing',
                'group'       => 'synthesis',
                'label'       => 'C1 — Actor briefing',
                'description' => 'Concise briefing on a single actor for a time-constrained operator',
                'body'        => 'You are an intelligence analyst producing concise actor briefings. A briefing covers: who the actor is, their significance, recent activity pattern, reliability assessment, and any flags requiring attention. Write for a time-constrained senior operator. Be precise and evidence-based. Every claim must be traceable to the record. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'c2_narrative',
                'group'       => 'synthesis',
                'label'       => 'C2 — Narrative synthesis',
                'description' => 'Project-level intelligence narrative from actor set and goal',
                'body'        => 'You are an intelligence analyst producing narrative synthesis for a project. Synthesise the intelligence picture from actor behaviour, relationships, and events. Identify the dominant narrative, key tensions, outstanding uncertainties, and what the evidence suggests about likely developments. Write for operational use. Be direct and avoid hedging with no evidentiary basis. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'c3_events',
                'group'       => 'synthesis',
                'label'       => 'C3 — DISTIL event extraction',
                'description' => 'Extracts behavioural events from documents',
                'body'        => 'You are an intelligence analyst extracting behavioural events from documents. Focus on commitments, admissions, denials, claims, decisions, affiliations, and significant actions. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'c3_claims',
                'group'       => 'synthesis',
                'label'       => 'C3 — DISTIL claim extraction',
                'description' => 'Extracts significant claims and assertions from documents',
                'body'        => 'You are an intelligence analyst extracting significant claims and assertions. Focus on stated positions, promises, denials, and contested facts. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name'        => 'c4_pre_composition',
                'group'       => 'synthesis',
                'label'       => 'C4 — Pre-composition briefing',
                'description' => 'Prepares operator before engaging with an actor',
                'body'        => 'You are an intelligence analyst preparing a pre-composition brief before an operator engages with an actor. Surface the most operationally relevant facts: relationship history, recent signals, known positions, reliability assessment, and any contradictions or risks. Be concise and direct. Return only valid JSON — no markdown.',
                'is_active'   => true, 'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void {
        DB::table('system_prompts')->whereIn('name', [
            'b1_email','b2_divergence','b3_contradiction','b4_news','b5_entities',
            'b6_enrichment','b7_leverage','b_grade','b_trajectory',
            'c1_actor_briefing','c2_narrative','c3_events','c3_claims','c4_pre_composition',
        ])->delete();
    }
};
