import css from './style.module.css';
import {
	Button,
	Flex,
	FlexItem,
	Spinner,
	__experimentalText as Text,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
} from '@wordpress/components';
import { DataViews } from '@wordpress/dataviews';
import type { Field, View } from '@wordpress/dataviews';
import classNames from 'classnames';
import { useState } from 'react';
import { PlaygroundRoute, redirectTo } from '../../../lib/state/url/router';
import { joinPaths } from '@php-wasm/util';
import useFetch from '../../../lib/hooks/use-fetch';
import { removeSite } from '../../../lib/state/redux/slice-sites';
import { useAppDispatch } from '../../../lib/state/redux/store';

type BlueprintsIndexEntry = {
	title: string;
	description: string;
	author: string;
	categories: string[];
	path: string;
};

export function BlueprintsPanel({
	className,
	mobileUi,
}: {
	className: string;
	mobileUi?: boolean;
}) {
	// @TODO: memoize across component loads.
	// @TODO: store in the local cache for offline mode support. Consider implementing
	//        something like `locallyCachedFetch` that would work similarly to the service
	//        worker plumbing we have, that is fetch the data from the network when we're online,
	//        and fetch from the cache when we're offline.
	const { data, isLoading, isError } = useFetch<
		Record<string, BlueprintsIndexEntry>
	>(
		'https://raw.githubusercontent.com/WordPress/blueprints/trunk/index.json'
	);

	const [view, setView] = useState<View>({
		type: 'list',
		fields: ['header', 'description'],
	});

	const dispatch = useAppDispatch();

	let indexEntries: BlueprintsIndexEntry[] = data
		? Object.entries(data).map(([path, entry]) => ({ ...entry, path }))
		: [];

	if (view.search) {
		indexEntries = indexEntries.filter((entry) => {
			return [entry.title, entry.description]
				.join(' ')
				.toLocaleLowerCase()
				.includes(view.search!.toLocaleLowerCase());
		});
	}

	function previewBlueprint(blueprintPath: BlueprintsIndexEntry['path']) {
		// @TODO: Don't assume the Blueprint preview site slug is necessarily "blueprint-preview".
		dispatch(removeSite('blueprint-preview'));
		redirectTo(
			PlaygroundRoute.newTemporarySite({
				query: {
					name: 'Blueprint preview',
					'blueprint-url': joinPaths(
						'https://raw.githubusercontent.com/WordPress/blueprints/trunk/',
						blueprintPath
					),
				},
			})
		);
	}

	const fields: Field<BlueprintsIndexEntry>[] = [
		{
			id: 'header',
			label: 'Header',
			enableHiding: false,
			render: ({ item }) => {
				return (
					<HStack spacing={2} justify="space-between">
						<VStack spacing={0} style={{ flexGrow: 1 }}>
							<h3 className={css.blueprintTitle}>{item.title}</h3>
							<Text>
								By{' '}
								<a
									target="_blank"
									rel="noreferrer"
									href={`https://github.com/${item.author}`}
								>
									{item.author}
								</a>
							</Text>
						</VStack>
						<Button variant="primary">Preview</Button>
					</HStack>
				);
			},
		},
		{
			id: 'description',
			label: 'Description',
			render: ({ item }) => {
				return <Text>{item.description}</Text>;
			},
		},
	];

	return (
		<section
			className={classNames(className, css.blueprintsPanel, {
				[css.isMobile]: mobileUi,
			})}
		>
			<Flex
				gap={0}
				direction="column"
				justify="flex-start"
				expanded={true}
			>
				<FlexItem
					className={css.padded}
					style={{ flexShrink: 0, paddingBottom: 0 }}
				>
					<>
						<h2 className={css.sectionTitle}>
							Playground Blueprints
						</h2>
						<p>
							Let's explain what this section is all about here.
						</p>
					</>
				</FlexItem>
				<FlexItem style={{ alignSelf: 'stretch', overflowY: 'scroll' }}>
					<div className={css.padded} style={{ paddingTop: 0 }}>
						{isLoading ? (
							<Spinner />
						) : isError ? (
							<p>Error – TODO explain the details</p>
						) : (
							<DataViews<BlueprintsIndexEntry>
								data={indexEntries as BlueprintsIndexEntry[]}
								view={view}
								onChangeView={setView}
								onChangeSelection={(newSelection) => {
									if (newSelection?.length) {
										previewBlueprint(newSelection[0]);
									}
								}}
								search={true}
								isLoading={isLoading}
								fields={fields}
								header={null}
								getItemId={(item) => item?.path}
								paginationInfo={{
									totalItems: indexEntries.length,
									totalPages: 1,
								}}
								defaultLayouts={{
									list: {},
								}}
							/>
						)}
					</div>
				</FlexItem>
			</Flex>
		</section>
	);
}
