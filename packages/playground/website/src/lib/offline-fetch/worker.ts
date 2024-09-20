/// <reference lib="WebWorker" />

self.addEventListener('message', async (event) => {
	const data = event.data;

	if (data.type === 'fetch') {
		const { request, init } = data;
		const controller = new AbortController();
		const signal = controller.signal;

		// Listen for abort messages
		const abortListener = (event) => {
			if (event.data.type === 'abort') {
				controller.abort();
				self.removeEventListener('message', abortListener);
			}
		};
		self.addEventListener('message', abortListener);

		try {
			// Reconstruct the Request object
			const {
				url,
				method,
				headers,
				mode,
				credentials,
				cache,
				redirect,
				referrer,
				referrerPolicy,
				integrity,
				keepalive,
				body,
			} = request;
			const requestHeaders = new Headers(headers);
			const requestInit: RequestInit = {
				method,
				headers: requestHeaders,
				mode,
				credentials,
				cache,
				redirect,
				referrer,
				referrerPolicy,
				integrity,
				keepalive,
				body,
				signal,
			};

			const fetchRequest = new Request(url, requestInit);

			const response = await fetch(fetchRequest, { ...init, signal });

			// Cache the response
			const offlineFetchCache = await caches.open('offline-fetch-cache');
			offlineFetchCache.put(fetchRequest, response.clone());

			// Extract response details
			const { status, statusText } = response;
			const responseHeaders = {};
			response.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});

			// Transfer the response body stream
			const bodyStream = response.body;

			self.postMessage(
				{
					type: 'response',
					status,
					statusText,
					headers: responseHeaders,
					body: bodyStream,
				},
				[bodyStream]
			);
		} catch (error) {
			self.postMessage({ type: 'error', error: error.message });
		}
	}
});
