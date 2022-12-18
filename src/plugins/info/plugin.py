# Copyright (c) 2016-2022 Martin Donath <martin.donath@squidfunk.com>

# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to
# deal in the Software without restriction, including without limitation the
# rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
# sell copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
# IN THE SOFTWARE.

import logging
import os
import platform
import requests
import sys
import warnings

# Silence deprecation warnings coming from pip
warnings.filterwarnings("ignore", category = DeprecationWarning)

from colorama import Fore, Style
from io import BytesIO
from mkdocs import utils
from mkdocs.commands.build import DuplicateFilter
from mkdocs.config import config_options as opt
from mkdocs.config.base import Config
from mkdocs.plugins import BasePlugin, event_priority
from mkdocs.structure.files import get_files
from pkg_resources import get_distribution
from zipfile import ZipFile, ZIP_DEFLATED

try:
    from pipdeptree import (
        PackageDAG,
        get_installed_distributions,
        render_json_tree
    )
    dependencies = True
except ImportError:
    dependencies = False

# -----------------------------------------------------------------------------
# Class
# -----------------------------------------------------------------------------

# Info plugin configuration scheme
class InfoPluginConfig(Config):
    enabled = opt.Type(bool, default = True)

    # Options for archive
    archive = opt.Type(bool, default = True)
    archive_name = opt.Type(str, default = "example")
    archive_stop_on_violation = opt.Type(bool, default = True)

# -----------------------------------------------------------------------------

# Info plugin
class InfoPlugin(BasePlugin[InfoPluginConfig]):

    # Initialize plugin (run earliest)
    @event_priority(100)
    def on_config(self, config):
        if not self.config.enabled:
            return

        # Check if required dependencies are installed
        if not dependencies:
            log.error("Required dependencies of \"info\" plugin not found.")
            print(Style.NORMAL)
            print("  pip install \"mkdocs-material[info]\"")
            print(Style.NORMAL)
            sys.exit(1)

        # Resolve latest version
        url = "https://github.com/squidfunk/mkdocs-material/releases/latest"
        res = requests.get(url, allow_redirects = False)

        # Check if we're running the latest version
        _, version = res.headers.get("location").rsplit("/", 1)
        package = get_distribution("mkdocs-material")
        if package.version != version:
            log.error("Please update to the latest version.")
            self._help_on_versions_and_exit(package.version, version)

        # Print message that we're creating a bug report
        log.info("Started archive creation for bug report")

        # Check that there are no overrides in place - we need to use a little
        # hack to detect whether the custom_dir setting was used without parsing
        # mkdocs.yml again - we check at which position the directory provided
        # by the theme resides, and if it's not the first one, abort.
        base = utils.get_theme_dir(config.theme.name)
        if config.theme.dirs.index(base):
            log.error("Please remove 'custom_dir' setting.")
            self._help_on_customizations_and_exit()

        # Check that there are no hooks in place - hooks can alter the behavior
        # of MkDocs in unpredictable ways, which is why they must be considered
        # being customizations. Thus, we can't offer support for debugging and
        # must abort here.
        if config.hooks:
            log.error("Please remove 'hooks' setting.")
            self._help_on_customizations_and_exit()

        # Create in-memory archive
        archive = BytesIO()
        archive_name = self.config.archive_name

        # Create self-contained example from project
        files = []
        with ZipFile(archive, "a", ZIP_DEFLATED, False) as f:
            for path in ["mkdocs.yml", "requirements.txt"]:
                if os.path.isfile(path):
                    f.write(path, os.path.join(archive_name, path))

            # Append all files visible to MkDocs
            for file in get_files(config):
                path = os.path.relpath(file.abs_src_path, os.path.curdir)
                f.write(path, os.path.join(archive_name, path))

            # Add dependency tree as returned by pipdeptree
            f.writestr(
                os.path.join(archive_name, ".dependencies.json"),
                render_json_tree(PackageDAG.from_pkgs(
                    get_installed_distributions(local_only = True)
                ), 2)
            )

            # Add version information
            mkdocs = get_distribution("mkdocs")
            f.writestr(
                os.path.join(archive_name, ".versions.log"),
                "\n".join([
                    f"-----------------------------------",
                    f"  Material for MkDocs: {version}",
                    f"  MkDocs: {mkdocs.version}",
                    f"-----------------------------------",
                    f"  Platform: {platform.system()}",
                    f"  Python: {platform.python_version()}",
                    f"-----------------------------------"
                ])
            )

            # Retrieve list of processed files
            for a in f.filelist:
                files.append("".join([
                    Fore.LIGHTBLACK_EX, a.filename, " ",
                    _size(a.compress_size)
                ]))

        # Finally, write archive to disk
        buffer = archive.getbuffer()
        with open(f"{archive_name}.zip", "wb") as f:
            f.write(archive.getvalue())

        # Print summary
        log.info("Archive successfully created:")
        print(Style.NORMAL)

        # Print archive file names
        files.sort()
        for file in files:
            print(f"  {file}")

        # Print archive name
        print(Style.RESET_ALL)
        print("".join([
            "  ", f.name, " ",
            _size(buffer.nbytes, 10)
        ]))

        # Print warning when file size is excessively large
        print(Style.RESET_ALL)
        if buffer.nbytes > 1000000:
            log.warning("Archive exceeds recommended maximum size of 1 MB")

        # Aaaaaand done.
        sys.exit(1)

    # -------------------------------------------------------------------------

    # Print help on versions and exit
    def _help_on_versions_and_exit(self, have, need):
        print(Fore.RED)
        print("  When reporting issues, please first update to the latest")
        print("  version of Material for MkDocs, as the problem might already")
        print("  be fixed in the latest version. This helps reduce duplicate")
        print("  efforts and saves the maintainers time.")
        print(Style.NORMAL)
        print(f"  Please update from {have} to {need}.")
        print(Style.RESET_ALL)
        print(f"  pip install \"mkdocs-material=={need}\"")
        print(Style.NORMAL)

        # Exit, unless explicitly told not to
        if self.config.archive_stop_on_violation:
            sys.exit(1)

    # Print help on customizations and exit
    def _help_on_customizations_and_exit(self):
        print(Fore.RED)
        print("  When reporting issues, you must remove all customizations")
        print("  and check if the problem persists. If not, the problem is")
        print("  caused by your overrides. Please understand that we can't")
        print("  help you debug your customizations. Please remove:")
        print(Style.NORMAL)
        print("  - theme.custom_dir")
        print("  - hooks")
        print(Fore.YELLOW)
        print("  Additionally, please remove all third-party JavaScript or")
        print("  CSS not explicitly mentioned in our documentation:")
        print(Style.NORMAL)
        print("  - extra_css")
        print("  - extra_javascript")
        print(Style.RESET_ALL)

        # Exit, unless explicitly told not to
        if self.config.archive_stop_on_violation:
            sys.exit(1)

# -----------------------------------------------------------------------------
# Helper functions
# -----------------------------------------------------------------------------

# Print human-readable size
def _size(value, factor = 1):
    color = Fore.GREEN
    if   value > 100000 * factor: color = Fore.RED
    elif value >  25000 * factor: color = Fore.YELLOW
    for unit in ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB"]:
        if abs(value) < 1000.0:
            return f"{color}{value:3.1f} {unit}"
        value /= 1000.0

# -----------------------------------------------------------------------------
# Data
# -----------------------------------------------------------------------------

# Set up logging
log = logging.getLogger("mkdocs")
log.addFilter(DuplicateFilter())
