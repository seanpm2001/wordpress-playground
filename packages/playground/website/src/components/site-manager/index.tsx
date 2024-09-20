import { Sidebar } from './sidebar';
import { useMediaQuery } from '@wordpress/compose';
import { useActiveSite, useAppSelector } from '../../lib/state/redux/store';

import css from './style.module.css';
import { SiteInfoPanel } from './site-info-panel';
import classNames from 'classnames';

import { forwardRef } from 'react';
import { BlueprintsPanel } from './blueprints-panel';

export const SiteManager = forwardRef<
	HTMLDivElement,
	{
		className?: string;
	}
>(({ className }, ref) => {
	const activeSite = useActiveSite()!;

	const fullScreenSections = useMediaQuery('(max-width: 875px)');
	const activeSiteManagerSection = useAppSelector(
		(state) => state.ui.siteManagerSection
	);

	const sidebar = <Sidebar className={css.sidebar} />;

	let activePanel;
	switch (activeSiteManagerSection) {
		case 'blueprints':
			activePanel = <BlueprintsPanel className={css.blueprintsPanel} />;
			break;
		case 'site-details':
			activePanel = activeSite ? (
				<SiteInfoPanel
					key={activeSite?.slug}
					className={css.siteManagerSiteInfo}
					site={activeSite}
					mobileUi={fullScreenSections}
				/>
			) : null;
			break;
		default:
			activePanel = null;
			break;
	}

	if (fullScreenSections) {
		return (
			<div className={classNames(css.siteManager, className)} ref={ref}>
				{activeSiteManagerSection === 'sidebar' ? sidebar : activePanel}
			</div>
		);
	}

	return (
		<div className={classNames(css.siteManager, className)} ref={ref}>
			{sidebar}
			{activePanel}
		</div>
	);
});
