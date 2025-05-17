from openai import OpenAI

def kimi(question, history=None):
	client = OpenAI(
		api_key = "sk-DhVW0coT3r2Kj4hpqX9Uy7p0NRgj6ETBG9WfB1cHQLoDrOgO",
		base_url = "https://api.moonshot.cn/v1",
	)

	messages = [
			{
			"role": "user",
			"content": question
			}
		]
	
	if history is not None:
		messages = history + messages

	completion = client.chat.completions.create(
		model = "moonshot-v1-8k",
		messages = messages,
		temperature = 0.3,
	)

	history = messages + [
		{
			"role": "assistant",
			"content": completion.choices[0].message.content
		}
	]

	return completion.choices[0].message.content, history

def deepseek(question, history=None, model="r1"):
	client = OpenAI(
		base_url="https://openrouter.ai/api/v1",
		api_key="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",
	)

	if model == "v3":
		model_name = "deepseek/deepseek-v3-base:free"
	elif model == "r1":
		model_name = "deepseek/deepseek-r1:free"
	else:
		return "Invalid model name"

	messages = [
			{
			"role": "user",
			"content": question
			}
		]
	
	if history is not None:
		messages = history + messages

	completion = client.chat.completions.create(
		extra_headers={},
		extra_body={},
		model=model_name,
		messages=messages
	)

	history = messages + [
		{
			"role": "assistant",
			"content": completion.choices[0].message.content
		}
	]

	return completion.choices[0].message.content, history