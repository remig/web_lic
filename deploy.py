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

# upload all files in dist/
files = []
os.chdir('dist')
for (dir, dirnames, filesnames) in os.walk('.'):
	for fn in filesnames:
		files.append(dir + fn)
for fn in files:
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
