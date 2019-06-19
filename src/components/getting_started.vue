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
		<ul class="list-group">
			<li class="list-group-item">
				<a class="lineLink" @click.prevent="importModel">
					<i class="far fa-edit fa-2x fa-pull-left" />
					{{tr('dialog.welcome.import')}}
				</a>
			</li>
			<li class="list-group-item">
				<a class="lineLink" @click.prevent="open">
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
					<li>
						<a @click.prevent="importTrivial">{{tr('dialog.welcome.models.trivial')}}</a>
					</li>
					<li>
						<a @click.prevent="importAlligator">{{tr('dialog.welcome.models.alligator')}}</a>
					</li>
					<li>
						<a @click.prevent="importXWing">{{tr('dialog.welcome.models.xwing')}}</a>
					</li>
				</ul>
			</li>
			<li class="list-group-item">
				<a class="lineLink" @click.prevent="showAbout">
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
		importModel() {
			this.hideMessage();
			this.app.importCustomModel();
		},
		open() {
			this.hideMessage();
			this.app.openLicFile();
		},
		importTrivial() {
			this.hideMessage();
			this.app.importBuiltInModel('trivial_model.ldr');
		},
		importAlligator() {
			this.hideMessage();
			this.app.importBuiltInModel('20015 - Alligator.mpd');
		},
		importXWing() {
			this.hideMessage();
			this.app.importBuiltInModel('7140 - X-Wing Fighter.mpd');
		},
		showAbout() {
			DialogManager('aboutLicDialog');
		},
		hideMessage() {
			document.querySelector('.gettingStarted').classList.add('hidden');
		}
	}
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
