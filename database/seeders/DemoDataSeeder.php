<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\Actor;
use App\Models\ActorRelationship;
use App\Models\BehaviouralEvent;

class DemoDataSeeder extends Seeder
{
    private int $tenantId = 1;

    public function run(): void
    {
        // ── COMPANIES ────────────────────────────────────────────────────────
        $meridian = $this->actor('organisation', 'commons', 'Meridian Capital Group', [
            'primary_email'      => 'info@meridiancapital.com',
            'importance_tier'    => 'tier_1',
            'reliability_profile'=> 'rock',
            'trajectory'         => 'ascending',
            'dormancy_state'     => 'active',
            'tags'               => ['private-equity','finance','infrastructure'],
            'notes'              => 'Mid-market PE firm with growing infrastructure portfolio. Key LP relationships in Gulf sovereign funds.',
            'subtype_data'       => ['industry' => 'Private Equity', 'hq_country' => 'US', 'hq_city' => 'New York'],
        ]);

        $arrowhead = $this->actor('organisation', 'commons', 'Arrowhead Strategic Advisors', [
            'primary_email'      => 'contact@arrowheadsa.com',
            'importance_tier'    => 'tier_2',
            'reliability_profile'=> 'sand',
            'trajectory'         => 'stable',
            'dormancy_state'     => 'active',
            'tags'               => ['advisory','defence','government-relations'],
            'subtype_data'       => ['industry' => 'Strategic Advisory', 'hq_country' => 'US', 'hq_city' => 'Washington DC'],
        ]);

        $nordicre = $this->actor('organisation', 'commons', 'Nordic Re Holdings', [
            'primary_email'      => 'ir@nordicre.com',
            'importance_tier'    => 'tier_3',
            'reliability_profile'=> 'fog',
            'trajectory'         => 'declining',
            'dormancy_state'     => 'dormant',
            'tags'               => ['reinsurance','europe'],
            'subtype_data'       => ['industry' => 'Insurance', 'hq_country' => 'SE', 'hq_city' => 'Stockholm'],
        ]);

        // ── GOVERNMENTS ───────────────────────────────────────────────────────
        $usdoc = $this->actor('government', 'commons', 'US Department of Commerce', [
            'importance_tier'    => 'tier_1',
            'reliability_profile'=> 'bedrock',
            'trajectory'         => 'stable',
            'dormancy_state'     => 'active',
            'tags'               => ['federal','regulatory','trade'],
            'subtype_data'       => ['jurisdiction' => 'Federal', 'country' => 'US', 'level' => 'national'],
        ]);

        $gcab = $this->actor('government', 'commons', 'Gulf Co-operation Advisory Board', [
            'importance_tier'    => 'tier_2',
            'reliability_profile'=> 'sand',
            'trajectory'         => 'ascending',
            'dormancy_state'     => 'active',
            'tags'               => ['gulf','sovereign','multilateral'],
            'subtype_data'       => ['jurisdiction' => 'Multilateral', 'country' => 'AE', 'level' => 'regional'],
        ]);

        // ── CONTACTS ──────────────────────────────────────────────────────────
        $harlow = $this->actor('person', 'commons', 'Catherine Harlow', [
            'primary_email'      => 'c.harlow@meridiancapital.com',
            'importance_tier'    => 'tier_1',
            'reliability_profile'=> 'bedrock',
            'trajectory'         => 'ascending',
            'dormancy_state'     => 'active',
            'tags'               => ['decision-maker','finance','infrastructure'],
            'notes'              => 'Managing Director, Infrastructure at Meridian. Controls allocation committee. Former Treasury official.',
            'subtype_data'       => ['title' => 'Managing Director', 'organisation' => 'Meridian Capital Group'],
        ]);

        $voss = $this->actor('person', 'vault', 'Erik Voss', [
            'primary_email'      => 'e.voss@arrowheadsa.com',
            'importance_tier'    => 'tier_1',
            'reliability_profile'=> 'rock',
            'trajectory'         => 'stable',
            'dormancy_state'     => 'active',
            'tags'               => ['intermediary','defence','procurement'],
            'notes'              => 'Senior partner. Known to facilitate introductions between defence contractors and procurement officials. Relationship to GCAB unclear.',
            'subtype_data'       => ['title' => 'Senior Partner', 'organisation' => 'Arrowhead Strategic Advisors'],
        ]);

        $okonkwo = $this->actor('person', 'commons', 'Dr. Adaeze Okonkwo', [
            'primary_email'      => 'a.okonkwo@state.gov',
            'importance_tier'    => 'tier_2',
            'reliability_profile'=> 'rock',
            'trajectory'         => 'ascending',
            'dormancy_state'     => 'active',
            'tags'               => ['government','trade-policy','africa-desk'],
            'subtype_data'       => ['title' => 'Deputy Assistant Secretary', 'organisation' => 'US Department of Commerce'],
        ]);

        $strand = $this->actor('person', 'commons', 'Magnus Strand', [
            'primary_email'      => 'm.strand@nordicre.com',
            'importance_tier'    => 'tier_3',
            'reliability_profile'=> 'mud',
            'trajectory'         => 'declining',
            'dormancy_state'     => 'dormant',
            'tags'               => ['finance','europe','unreliable'],
            'notes'              => 'CEO Nordic Re. Multiple contradictory statements on solvency position in Q4. Treat with caution.',
            'subtype_data'       => ['title' => 'CEO', 'organisation' => 'Nordic Re Holdings'],
        ]);

        $al_rashid = $this->actor('person', 'vault', 'Tariq Al-Rashid', [
            'primary_email'      => 'tariq.alrashid@gcab.ae',
            'importance_tier'    => 'tier_1',
            'reliability_profile'=> 'sand',
            'trajectory'         => 'ascending',
            'dormancy_state'     => 'active',
            'tags'               => ['gulf','sovereign-wealth','infrastructure'],
            'notes'              => 'Secretary-General GCAB. Increasing involvement in US infrastructure deals. Voss connection confirmed.',
            'subtype_data'       => ['title' => 'Secretary-General', 'organisation' => 'Gulf Co-operation Advisory Board'],
        ]);

        // ── RELATIONSHIPS ─────────────────────────────────────────────────────
        $this->rel($harlow, $meridian, 'affiliation', [
            'direction'            => 'directed',
            'reliability_grade'    => 'bedrock',
            'status'               => 'active',
            'stance'               => 'party_line',
            'posture_toward_operator'=> 'ally',
            'actual_influence'     => 'high',
            'leverage_read'        => 'channel',
        ]);

        $this->rel($voss, $arrowhead, 'affiliation', [
            'direction'            => 'directed',
            'reliability_grade'    => 'rock',
            'status'               => 'active',
            'stance'               => 'independent',
            'posture_toward_operator'=> 'neutral',
            'actual_influence'     => 'high',
            'leverage_read'        => 'signal',
        ]);

        $this->rel($okonkwo, $usdoc, 'affiliation', [
            'direction'            => 'directed',
            'reliability_grade'    => 'bedrock',
            'status'               => 'active',
            'stance'               => 'party_line',
            'posture_toward_operator'=> 'ally',
            'actual_influence'     => 'medium',
            'leverage_read'        => 'channel',
        ]);

        $this->rel($strand, $nordicre, 'affiliation', [
            'direction'            => 'directed',
            'reliability_grade'    => 'mud',
            'status'               => 'active',
            'stance'               => 'divergent',
            'posture_toward_operator'=> 'unknown',
            'actual_influence'     => 'medium',
            'leverage_read'        => 'risk',
        ]);

        $this->rel($al_rashid, $gcab, 'affiliation', [
            'direction'            => 'directed',
            'reliability_grade'    => 'sand',
            'status'               => 'active',
            'stance'               => 'independent',
            'posture_toward_operator'=> 'neutral',
            'actual_influence'     => 'high',
            'leverage_read'        => 'signal',
        ]);

        $this->rel($voss, $al_rashid, 'personal', [
            'direction'         => 'bidirectional',
            'reliability_grade' => 'sand',
            'status'            => 'active',
            'notes'             => 'Confirmed meeting at Dubai Airshow 2024. Nature of relationship unclear.',
        ]);

        $this->rel($meridian, $gcab, 'coalition', [
            'direction'         => 'bidirectional',
            'reliability_grade' => 'rock',
            'status'            => 'active',
            'notes'             => 'MOU on infrastructure co-investment signed Q1 2025.',
        ]);

        $this->rel($harlow, $okonkwo, 'personal', [
            'direction'         => 'bidirectional',
            'reliability_grade' => 'rock',
            'status'            => 'active',
            'notes'             => 'Former colleagues, Treasury. Regular contact.',
        ]);

        // ── BEHAVIOURAL EVENTS ────────────────────────────────────────────────
        // Harlow events (bedrock source — enough for divergence)
        $this->event($harlow, 'commitment', 'bedrock', '2025-09-15',
            'Committed to $200M infrastructure allocation in fiscal year 2026',
            'During Meridian Q3 investor call, Harlow stated allocation committee had approved a $200M ringfenced infrastructure tranche for FY2026, with first close expected Q1.');

        $this->event($harlow, 'position', 'bedrock', '2025-10-02',
            'Opposes public co-investment structures for infrastructure deals',
            'In private briefing, stated Meridian\'s LP base is "allergic" to public co-investment due to disclosure requirements. Preference is pure private structures.');

        $this->event($harlow, 'claim', 'rock', '2025-11-20',
            'Claims GCAB relationship is arm\'s length and commercial only',
            'When asked directly, Harlow described the GCAB MOU as "purely commercial, standard LP terms, nothing unusual." Did not mention Voss connection.');

        $this->event($harlow, 'action', 'bedrock', '2025-12-01',
            'Hired Arrowhead Strategic Advisors as placement agent for Gulf fundraise',
            'SEC Form D filing confirms Arrowhead as placement agent for Meridian Infrastructure Fund IV, which is targeting Gulf sovereign LPs.');

        $this->event($harlow, 'commitment', 'rock', '2026-01-10',
            'Committed to no use of intermediaries with government connections',
            'In LP due diligence questionnaire response, Harlow affirmed Meridian does not use placement agents with current or former government affiliations.');

        $this->event($harlow, 'denial', 'sand', '2026-02-14',
            'Denied knowledge of Voss-Al-Rashid relationship',
            'In follow-up call, Harlow stated she was unaware Voss had any prior relationship with GCAB leadership. This contradicts SEC filing timeline.');

        // Voss events
        $this->event($voss, 'claim', 'sand', '2025-08-20',
            'Claims Arrowhead has no direct relationships with sovereign wealth officials',
            'Website and pitch materials state firm "maintains strict separation" from government officials.');

        $this->event($voss, 'action', 'rock', '2025-11-17',
            'Attended Dubai Airshow alongside Tariq Al-Rashid',
            'Confirmed via social media and press photography. Shared panel appearance on Gulf infrastructure investment.');

        $this->event($voss, 'action', 'bedrock', '2025-12-15',
            'Signed as placement agent for Meridian Infrastructure Fund IV',
            'SEC filing confirms engagement. Commission structure not disclosed.');

        // Strand events (divergent — contradictory solvency statements)
        $this->event($strand, 'claim', 'mud', '2025-07-01',
            'Claims Nordic Re solvency ratio comfortably above 200%',
            'Investor day presentation stated Solvency II ratio at 218%, described balance sheet as "fortress."');

        $this->event($strand, 'position', 'fog', '2025-09-30',
            'Privately acknowledged solvency pressures to reinsurance broker',
            'Via intermediary: Strand indicated ratio may be "closer to 160% when you adjust for the legacy book." Unverified.');

        $this->event($strand, 'commitment', 'mud', '2025-10-15',
            'Committed to no capital raise in 2026',
            'Q3 earnings call: "We have no plans whatsoever for equity issuance in the next 12 months."');

        $this->event($strand, 'action', 'bedrock', '2026-01-28',
            'Filed prospectus for €300M rights issue',
            'Filing with Nasdaq Stockholm confirms €300M rights issue, citing "prudent capital management."');

        // Al-Rashid events
        $this->event($al_rashid, 'position', 'sand', '2025-10-10',
            'Stated GCAB infrastructure mandate limited to GCC region',
            'Public statement at Qatar Economic Forum: GCAB\'s mandate "focuses exclusively on intra-GCC and regional infrastructure."');

        $this->event($al_rashid, 'action', 'rock', '2026-02-01',
            'Co-signed MOU with Meridian Capital for US infrastructure co-investment',
            'Press release confirms GCAB and Meridian signed co-investment MOU covering North American infrastructure assets. Contradicts stated regional mandate.');

        $this->event($al_rashid, 'signal', 'sand', '2026-03-01',
            'Increasingly visible in Washington DC policy circles',
            'Three confirmed appearances at DC think-tank events in Q1 2026. Pattern suggests active relationship-building with federal officials.');

        $this->command->info('Demo data seeded: 5 companies/governments, 5 contacts, 8 relationships, 17 behavioural events.');
    }

    private function actor(string $type, string $pool, string $name, array $attrs): Actor
    {
        return Actor::create(array_merge([
            'id'         => (string) Str::uuid(),
            'tenant_id'  => $this->tenantId,
            'actor_type' => $type,
            'pool'       => $pool,
            'display_name'=> $name,
        ], $attrs));
    }

    private function rel(Actor $source, Actor $target, string $type, array $attrs): void
    {
        ActorRelationship::create(array_merge([
            'id'               => (string) Str::uuid(),
            'tenant_id'        => $this->tenantId,
            'source_actor_id'  => $source->id,
            'target_actor_id'  => $target->id,
            'relationship_type'=> $type,
            'direction'        => 'directed',
            'reliability_grade'=> 'sand',
            'status'           => 'active',
            'acknowledged'     => false,
        ], $attrs));
    }

    private function event(Actor $actor, string $type, string $grade, string $date, string $summary, string $content): void
    {
        BehaviouralEvent::create([
            'id'               => (string) Str::uuid(),
            'tenant_id'        => $this->tenantId,
            'actor_id'         => $actor->id,
            'pool'             => $actor->pool,
            'event_type'       => $type,
            'reliability_grade'=> $grade,
            'event_date'       => $date,
            'summary'          => $summary,
            'content'          => $content,
            'source_type'      => 'operator',
        ]);
    }
}
