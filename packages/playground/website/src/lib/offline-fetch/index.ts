export function offlineFetch(
	input: RequestInfo,
	init?: RequestInit
): Promise<Response> {
	return new Promise(async (resolve, reject) => {
		let request: Request;

		// Parse the input into a Request object
		if (input instanceof Request) {
			request = input.clone();
		} else if (typeof input === 'string') {
			request = new Request(input, init);
		} else {
			reject(new Error('Invalid input'));
			return;
		}

		// Create an AbortController to handle aborting
		const controller = new AbortController();
		const signal = controller.signal;

		// If the init has a signal, connect it to our controller
		if (init && init.signal) {
			init.signal.addEventListener('abort', () => {
				controller.abort();
			});
		}

		// If offline, try to retrieve the response from CacheStorage
		if (!navigator.onLine) {
			try {
				const cache = await caches.open('offline-fetch-cache');
				const cachedResponse = await cache.match(request);

				if (cachedResponse) {
					resolve(cachedResponse.clone());
				} else {
					reject(new Error('Offline and no cached data available.'));
				}
			} catch (error) {
				reject(error);
			}
		} else {
			// Online: Use a worker to perform fetch and caching
			const worker = new Worker('offlineFetchWorker.js');

			// Set up message handling
			const handleMessage = (event: MessageEvent) => {
				const data = event.data;
				if (data.type === 'response') {
					// Reconstruct the Response object
					const { status, statusText, headers, body } = data;

					const responseHeaders = new Headers(headers);

					// Create the response body as a ReadableStream
					const stream = new ReadableStream({
						start(controller) {
							const reader = body.getReader();

							function push() {
								reader.read().then(({ done, value }) => {
									if (done) {
										controller.close();
										return;
									}
									controller.enqueue(value);
									push();
								});
							}

							push();
						},
						cancel() {
							body.cancel();
						},
					});

					const response = new Response(stream, {
						status,
						statusText,
						headers: responseHeaders,
					});

					resolve(response);

					worker.removeEventListener('message', handleMessage);
					worker.terminate();
				} else if (data.type === 'error') {
					reject(new Error(data.error));
					worker.removeEventListener('message', handleMessage);
					worker.terminate();
				}
			};

			worker.addEventListener('message', handleMessage);

			worker.addEventListener('error', (e) => {
				reject(new Error(`Worker error: ${e.message}`));
				worker.terminate();
			});

			signal.addEventListener('abort', () => {
				worker.postMessage({ type: 'abort' });
				worker.terminate();
				reject(new DOMException('Aborted', 'AbortError'));
			});

			// Send request data to worker
			worker.postMessage({
				type: 'fetch',
				request: {
					url: request.url,
					method: request.method,
					headers: [...request.headers.entries()],
					mode: request.mode,
					credentials: request.credentials,
					cache: request.cache,
					redirect: request.redirect,
					referrer: request.referrer,
					referrerPolicy: request.referrerPolicy,
					integrity: request.integrity,
					keepalive: request.keepalive,
					body:
						request.method !== 'GET' && request.method !== 'HEAD'
							? await request.clone().text()
							: undefined,
				},
				init: { ...init, signal: undefined },
			});
		}
	});
}
