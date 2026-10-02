# Research and open-source components

The matching pipeline is this app's implementation. It does not claim that a research paper validated this app's social outcomes.

- Microsoft Multilingual E5: https://github.com/microsoft/unilm/tree/master/e5
- Research report: https://arxiv.org/abs/2402.05672
- Original model: https://huggingface.co/intfloat/multilingual-e5-small (MIT)
- ONNX conversion: https://huggingface.co/Xenova/multilingual-e5-small (MIT)
- Runtime: https://github.com/huggingface/transformers.js (Apache-2.0)
- OCR: https://github.com/naptha/tesseract.js (Apache-2.0)
- Conversation-topic study informing the design: Nguyen et al., The Known Stranger, CHI 2015, https://doi.org/10.1145/2702123.2702411

Exact matches use canonical IDs. Local-server semantic retrieval uses normalized mean-pooled E5 vectors, same-category cross-user pair comparison, and cosine similarity. For symmetric similarity each item uses the `query:` prefix. A provisional 0.86 threshold generates candidates only; it has not been calibrated to shared-interest labels. Pair links are not transitively merged into an all-group claim. Results include the original input evidence.

LLM input extraction and candidate interpretation are optional. API credentials remain server-side. With no LLM configured the app uses exact/taxonomy matching; the local server can additionally run E5 and OCR. The hosted Worker does not load E5 weights or Tesseract because of memory/runtime limits.
