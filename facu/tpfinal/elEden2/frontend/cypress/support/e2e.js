// Cypress support file

const resolveApiBaseUrl = () => {
	return Cypress.env('API_BASE_URL') || 'http://localhost:8000/api/v1';
};

Cypress.Commands.add('apiLogin', (email, password) => {
	const apiBaseUrl = resolveApiBaseUrl();
	return cy.request('POST', `${apiBaseUrl}/token/`, {
		username: email,
		password
	}).then(({ body }) => {
		const tokens = { access: body.access, refresh: body.refresh };
		Cypress.env('authTokens', tokens);
		return tokens;
	});
});

Cypress.Commands.add('visitWithAuth', (path) => {
	const tokens = Cypress.env('authTokens');
	return cy.visit(path, {
		onBeforeLoad(win) {
			if (tokens?.access) {
				win.localStorage.setItem('accessToken', tokens.access);
			}
			if (tokens?.refresh) {
				win.localStorage.setItem('refreshToken', tokens.refresh);
			}
		}
	});
});

const buildScreenshotName = (test) => {
	const titles = [];
	let current = test;
	while (current) {
		if (current.title) {
			titles.unshift(current.title);
		}
		current = current.parent;
	}

	return titles
		.join(' -- ')
		.replace(/[^\w-]+/g, ' ')
		.trim()
		.replace(/\s+/g, '_');
};

afterEach(function () {
	const test = this.currentTest;
	if (!test || test.state !== 'passed') {
		return;
	}

	const name = buildScreenshotName(test) || 'passed_test';
	cy.screenshot(`passed/${name}`, { capture: 'viewport' });
});
