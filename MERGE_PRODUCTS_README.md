# Product Merger AI Script

This script uses AI (OpenAI) to intelligently identify and merge similar products from two JSON files.

## Features

- **AI-Powered Matching**: Uses OpenAI GPT models to determine if products are the same
- **Intelligent Merging**: Combines prices, URLs, and other data from multiple sources
- **Batch Processing**: Processes products in batches to manage API costs
- **Error Handling**: Robust error handling with retries
- **Configurable**: Customizable batch sizes, models, and thresholds

## Installation

1. Install required dependencies:
```bash
pip install openai
```

Or add to your requirements.txt:
```
openai>=1.0.0
```

## Setup

1. **Get OpenAI API Key**:
   - Sign up at https://platform.openai.com/
   - Get your API key from https://platform.openai.com/api-keys
   - Set it as an environment variable:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. **Configure Options** (optional):
   - Model: Default is `gpt-4o-mini` (cheaper). You can use `gpt-4` for better accuracy
   - Batch size: Default is 50 products per batch
   - Similarity threshold: Default is 0.85 (85% confidence)

## Usage

### Basic Usage

```bash
python merge_products_ai.py
```

This will:
- Read `products_restructured.json` and `offers_restructured.json`
- Merge similar products using AI
- Save results to `products_merged.json`

### Advanced Usage

```bash
python merge_products_ai.py \
  --file1 products_restructured.json \
  --file2 offers_restructured.json \
  --output products_merged.json \
  --model gpt-4 \
  --batch-size 30 \
  --api-key your-api-key
```

### Command Line Arguments

- `--file1`: Path to first JSON file (default: `products_restructured.json`)
- `--file2`: Path to second JSON file (default: `offers_restructured.json`)
- `--output`: Output file path (default: `products_merged.json`)
- `--api-key`: OpenAI API key (or set `OPENAI_API_KEY` env var)
- `--model`: OpenAI model to use (default: `gpt-4o-mini`)
- `--batch-size`: Number of products to process per batch (default: 50)

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: Default model to use (default: `gpt-4o-mini`)

## How It Works

1. **Loading**: Loads products from both JSON files
2. **Batching**: Groups products into batches for efficient processing
3. **AI Comparison**: For each batch, uses AI to compare product names and determine similarity
4. **Merging**: Merges similar products by:
   - Combining prices from all merchants
   - Combining URLs from all merchants
   - Using the best available image
   - Merging descriptions
   - Preserving category information
5. **Output**: Saves merged products to output file

## Merging Logic

When products are identified as similar:

- **Name**: Uses the longer/more complete name
- **Price**: Combines all prices from all merchants (arrays if multiple prices per merchant)
- **URL**: Combines all URLs from all merchants
- **Image**: Uses the best available image (prefers non-empty)
- **Description**: Combines descriptions if both exist
- **Category**: Uses category from first product

## Cost Estimation

The script uses OpenAI API which has costs:

- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **gpt-4**: ~$30 per 1M input tokens, ~$60 per 1M output tokens

For 12,000 products:
- With gpt-4o-mini: Approximately $0.50-$2.00
- With gpt-4: Approximately $50-$100

**Tip**: Start with `gpt-4o-mini` for cost efficiency, then use `gpt-4` if you need higher accuracy.

## Output Format

The output JSON file has this structure:

```json
{
  "products": [
    {
      "name": "...",
      "price": {
        "Store1": "price",
        "Store2": ["price1", "price2"]
      },
      "image_url": "...",
      "url": {
        "Store1": "url1",
        "Store2": "url2"
      },
      "description": "...",
      "category": "..."
    }
  ],
  "metadata": {
    "source_files": [...],
    "total_original": 12345,
    "total_merged": 12000,
    "products_merged_count": 345,
    "api_calls": 1500
  }
}
```

## Example

```bash
# Set API key
export OPENAI_API_KEY="sk-..."

# Run merge
python merge_products_ai.py \
  --file1 products_restructured.json \
  --file2 offers_restructured.json \
  --output products_merged.json \
  --model gpt-4o-mini \
  --batch-size 50
```

## Troubleshooting

### API Key Not Found
```
ERROR: OpenAI API key not found!
```
**Solution**: Set `OPENAI_API_KEY` environment variable or use `--api-key` argument

### Rate Limiting
If you hit rate limits, reduce `--batch-size` and increase delays between batches.

### Out of Memory
For very large files, reduce `--batch-size` to process smaller batches.

## Notes

- The script includes rate limiting to avoid API issues
- Similarity threshold is configurable (default 0.85 = 85% confidence)
- Products are only merged if AI confidence is above threshold
- The script preserves all merchant data when merging

