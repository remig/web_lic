import json, glob, os
from ftplib import FTP, error_perm

with open('package.json') as f:
	data = json.load(f)
version = data['version']

site = input('Site: ')
username = input('Username: ')
pwd = input('Password: ' )

print('Deploying version ' + version + ' to ' + site)
ftp = FTP('ftp.' + site, username, pwd)
ftp.cwd('~/' + site + '/lic')
ftp.mkd(version)
ftp.mkd(version + '/static')
ftp.mkd(version + '/dist')
bundles = glob.glob('dist/[0-9]*.bundle.js')
bundles = [n.replace(os.path.sep, '/') for n in bundles]
models = glob.glob('static/models/*')
files = ['whats_new.json', 'index.html', 'favicon.ico', 'dist/bundle.js', 'static/style.css', 'static/transparent_background.png']
for fn in files + bundles + models:
	try:
		ftp.delete(fn)
	except error_perm:
		pass
	upfile = open(fn, 'rb')
	ftp.storbinary('STOR ' + fn, upfile, blocksize=400000)
	upfile = open(fn, 'rb')
	ftp.storbinary('STOR ' + version + '/' + fn, upfile, blocksize=400000)
	print(' - Uploaded ' + fn)
ftp.quit()
print('Success')
