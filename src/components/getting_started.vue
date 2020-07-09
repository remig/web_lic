/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<div class="gettingStarted panel panel-default">
		<div class="panel-heading">
			<div class="pull-right close">
				<a :title="tr('dialog.welcome.close_tooltip')" @click.prevent="hideMessage()">
					<i class="fas fa-times fa-lg" />
				</a>
			</div>
			<h4>{{tr('dialog.welcome.title')}}</h4>
		</div>
		<ul class="list-group" data-testid="get-started-list">
			<li class="list-group-item">
				<a class="lineLink" data-testid="get-started-import" @click.prevent="importCustomModel">
					<i class="far fa-edit fa-2x fa-pull-left" />
					{{tr('dialog.welcome.import')}}
				</a>
			</li>
			<li class="list-group-item">
				<a class="lineLink" data-testid="get-started-open" @click.prevent="open">
					<i class="far fa-save fa-2x fa-pull-left" />
					{{tr('dialog.welcome.open')}}
				</a>
			</li>
			<li class="list-group-item">
				<span class="lineLink">
					<i class="fas fa-file-upload fa-2x fa-pull-left" />
					{{tr('dialog.welcome.test')}}
				</span>
				<ul class="list-inline">
					<li v-for="entry in demoModels" :key="entry.id">
						<a :data-testid="`import-${entry.id}`" @click.prevent="importModel(entry.fn)">
							{{tr('dialog.welcome.models.' + entry.id)}}
						</a>
					</li>
				</ul>
			</li>
			<li class="list-group-item">
				<a class="lineLink" data-testid="get-started-learn" @click.prevent="showAbout">
					<i class="fas fa-question-circle fa-2x fa-pull-left" />
					{{tr('dialog.welcome.learn')}}
				</a>
			</li>
		</ul>
	</div>
</template>

<script>

import DialogManager from '../dialog';

export default {
	props: ['app'],
	methods: {
		importCustomModel() {
			this.app.importCustomModel();
		},
		open() {
			this.app.openLicFile();
		},
		importModel(fn) {
			this.app.importBuiltInModel(fn);
		},
		showAbout() {
			DialogManager('aboutLicDialog');
		},
		hideMessage() {
			document.querySelector('.gettingStarted').classList.add('hidden');
		},
	},
	computed: {
		demoModels() {
			return [
				{id: 'trivial', fn: 'trivial_model.ldr'},
				{id: 'alligator', fn: '20015 - Alligator.mpd'},
				{id: 'xwing', fn: '7140 - X-Wing Fighter.mpd'},
			];
		},
	},
};

</script>

<style>

.gettingStarted {
	margin: 50px;
	background-color: #FFF;
	width: 100%;
	box-shadow: 3px 3px 1px 0px rgba(0,0,0,0.5);
	font-size: 15px;
}

.gettingStarted a {
	cursor: pointer;
}

.lineLink {
	color: #777;
}

.list-group-item ul {
	list-style-type: disc;
	margin: 1.75em 1.75em 0;
}

.list-group-item {
	padding: 2em;
}

.close {
	margin-top: .5em;
	opacity: .8;
}

.fa.fa-pull-left, .fab.fa-pull-left, .fal.fa-pull-left, .far.fa-pull-left, .fas.fa-pull-left {
	margin-top: -0.05em;
	margin-right: 0.6em;
}

.fa-2x {
	font-size: 1.5em;
}

.list-inline > li {
    padding-right: 15px;
    padding-left: 15px;
}

</style>
