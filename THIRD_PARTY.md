# Research and open-source components

The matching pipeline is this app's implementation. It does not claim that a research paper validated this app's social outcomes.

- Microsoft Multilingual E5: https://github.com/microsoft/unilm/tree/master/e5
- Research report: https://arxiv.org/abs/2402.05672
- Original model: https://huggingface.co/intfloat/multilingual-e5-small (MIT)
- ONNX conversion: https://huggingface.co/Xenova/multilingual-e5-small (MIT)
- Runtime: https://github.com/huggingface/transformers.js (Apache-2.0)
- Conversation-topic study informing the design: Nguyen et al., The Known Stranger, CHI 2015, https://doi.org/10.1145/2702123.2702411

Exact matches use canonical IDs. Semantic retrieval uses normalized last-token Qwen3 vectors, same-category cross-user pair comparison, and cosine similarity. Symmetric interest comparison embeds both items as plain category-and-interest text. A provisional 0.75 threshold generates candidates only; it has not been calibrated to shared-interest labels. Pair links are not transitively merged into an all-group claim. Results include the original input evidence.

LLM input extraction and candidate interpretation are optional. API credentials remain server-side. With no LLM configured the app uses exact/taxonomy matching; the browser and local server can additionally run Qwen3; playlist OCR has been removed. The hosted Worker does not load Qwen3 weights.

Current embedding model: Qwen/Qwen3-Embedding-0.6B (Apache-2.0), https://huggingface.co/Qwen/Qwen3-Embedding-0.6B
Technical report: Zhang et al., Qwen3 Embedding: Advancing Text Embedding and Reranking Through Foundation Models, https://arxiv.org/abs/2506.05176 (Section 2, last-token embedding).
ONNX conversion: https://huggingface.co/onnx-community/Qwen3-Embedding-0.6B-ONNX
The earlier E5 references document the baseline, which is no longer the production embedding model. This app uses pretrained weights, not the paper’s training pipeline, and its social matching threshold is not validated by the paper.

Taste extraction uses the Gemini Developer API (`gemini-3.1-flash-lite`) on the server. Browser Qwen3 generative downloads have been removed; Qwen3-Embedding remains dedicated to cosine similarity. Google pricing and data use: https://ai.google.dev/gemini-api/docs/pricing .


LinkedIn public profile imports use Bright Data LinkedIn Profiles Scraper API: https://brightdata.com/products/web-scraper/linkedin/profiles . They are optional and require the service operator's server-side key and the user's explicit choice of their own profile.