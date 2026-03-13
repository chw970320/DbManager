export interface NavigationMenuItem {
	href: string;
	label: string;
	icon: string;
}

export interface NavigationMenuGroup {
	id: string;
	label: string;
	items: NavigationMenuItem[];
}

export interface NavigationBreadcrumbOption {
	id: string;
	label: string;
	href: string;
	icon?: string;
}

export interface NavigationBreadcrumbItem {
	label: string;
	href?: string;
	children?: NavigationBreadcrumbOption[];
	activeChildId?: string;
	level: 1 | 2;
}

export const menuGroups: NavigationMenuGroup[] = [
	{
		id: 'standard',
		label: '표준 용어',
		items: [
			{ href: '/browse', label: '단어집', icon: 'search' },
			{ href: '/domain/browse', label: '도메인', icon: 'database' },
			{ href: '/term/browse', label: '용어', icon: 'tag' }
		]
	},
	{
		id: 'design',
		label: 'DB 설계',
		items: [
			{ href: '/database/browse', label: 'DB', icon: 'server' },
			{ href: '/entity/browse', label: '엔터티', icon: 'cube' },
			{ href: '/attribute/browse', label: '속성', icon: 'key' },
			{ href: '/table/browse', label: '테이블', icon: 'table' },
			{ href: '/column/browse', label: '컬럼', icon: 'columns' },
			{ href: '/erd', label: 'ERD', icon: 'diagram' }
		]
	},
	{
		id: 'tools',
		label: '운영 · 품질',
		items: [
			{ href: '/data-source/browse', label: '데이터 소스', icon: 'link' },
			{ href: '/quality-rule/browse', label: '품질 규칙', icon: 'check-circle' },
			{ href: '/profiling/browse', label: '프로파일링', icon: 'chart-bar' },
			{ href: '/snapshot/browse', label: '스냅샷', icon: 'save' }
		]
	}
];

function normalizePath(pathname: string): string {
	if (!pathname || pathname === '/') {
		return '/';
	}

	return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function findNavigationMatch(pathname: string) {
	const normalizedPath = normalizePath(pathname);

	for (const group of menuGroups) {
		const item = group.items.find((entry) => normalizePath(entry.href) === normalizedPath);
		if (item) {
			return { group, item };
		}
	}

	return null;
}

export function getNavigationBreadcrumbItems(pathname: string): NavigationBreadcrumbItem[] {
	const match = findNavigationMatch(pathname);

	if (!match) {
		return [];
	}

	return [
		{
			label: match.group.label,
			href: match.group.items[0]?.href,
			children: menuGroups.map((group) => ({
				id: group.id,
				label: group.label,
				href: group.items[0]?.href ?? '/'
			})),
			activeChildId: match.group.id,
			level: 1
		},
		{
			label: match.item.label,
			href: match.item.href,
			children: match.group.items.map((item) => ({
				id: item.href,
				label: item.label,
				href: item.href,
				icon: item.icon
			})),
			activeChildId: match.item.href,
			level: 2
		}
	];
}
