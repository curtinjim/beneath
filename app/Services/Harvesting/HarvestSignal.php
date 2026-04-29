<?php

namespace App\Services\Harvesting;

/**
 * Immutable value object carrying a single harvested signal.
 * Created by source implementations, consumed by HarvestActorJob.
 */
final class HarvestSignal
{
    public function __construct(
        public readonly string  $sourceId,
        public readonly string  $signalType,       // field_value | news_item | flag
        public readonly string  $proposedValue,
        public readonly string  $confidence,        // high | medium | low
        public readonly string  $reliabilityGrade,  // bedrock | rock | sand | mud | fog
        public readonly string  $sourceLabel,
        public readonly ?string $fieldName   = null,
        public readonly ?string $sourceUrl   = null,
        public readonly array   $rawData     = [],
    ) {}

    public static function fieldValue(
        string $sourceId,
        string $fieldName,
        string $proposedValue,
        string $confidence,
        string $reliabilityGrade,
        string $sourceLabel,
        ?string $sourceUrl = null,
        array $rawData = [],
    ): self {
        return new self(
            sourceId: $sourceId,
            signalType: 'field_value',
            proposedValue: $proposedValue,
            confidence: $confidence,
            reliabilityGrade: $reliabilityGrade,
            sourceLabel: $sourceLabel,
            fieldName: $fieldName,
            sourceUrl: $sourceUrl,
            rawData: $rawData,
        );
    }

    public static function newsItem(
        string $sourceId,
        string $headline,
        string $confidence,
        string $reliabilityGrade,
        string $sourceLabel,
        ?string $sourceUrl = null,
        array $rawData = [],
    ): self {
        return new self(
            sourceId: $sourceId,
            signalType: 'news_item',
            proposedValue: $headline,
            confidence: $confidence,
            reliabilityGrade: $reliabilityGrade,
            sourceLabel: $sourceLabel,
            fieldName: null,
            sourceUrl: $sourceUrl,
            rawData: $rawData,
        );
    }

    public static function flag(
        string $sourceId,
        string $flagDescription,
        string $reliabilityGrade,
        string $sourceLabel,
        ?string $sourceUrl = null,
        array $rawData = [],
    ): self {
        return new self(
            sourceId: $sourceId,
            signalType: 'flag',
            proposedValue: $flagDescription,
            confidence: 'high',
            reliabilityGrade: $reliabilityGrade,
            sourceLabel: $sourceLabel,
            fieldName: null,
            sourceUrl: $sourceUrl,
            rawData: $rawData,
        );
    }
}
