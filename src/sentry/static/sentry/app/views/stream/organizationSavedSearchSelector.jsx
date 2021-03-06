import React from 'react';
import PropTypes from 'prop-types';
import styled from 'react-emotion';
import Modal from 'react-bootstrap/lib/Modal';

import {t} from 'app/locale';
import Access from 'app/components/acl/access';
import Button from 'app/components/button';
import Confirm from 'app/components/confirm';
import MenuItem from 'app/components/menuItem';
import DropdownLink from 'app/components/dropdownLink';
import InlineSvg from 'app/components/inlineSvg';
import SentryTypes from 'app/sentryTypes';
import {TextField} from 'app/components/forms';
import space from 'app/styles/space';
import withApi from 'app/utils/withApi';
import {addLoadingMessage, clearIndicators} from 'app/actionCreators/indicator';
import {createSavedSearch} from 'app/actionCreators/savedSearches';

export default class OrganizationSavedSearchSelector extends React.Component {
  static propTypes = {
    organization: SentryTypes.Organization.isRequired,
    savedSearchList: PropTypes.array.isRequired,
    onSavedSearchCreate: PropTypes.func.isRequired,
    onSavedSearchSelect: PropTypes.func.isRequired,
    onSavedSearchDelete: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
    searchId: PropTypes.string,
  };

  getTitle() {
    const {searchId, query, savedSearchList} = this.props;
    let result;

    if (searchId) {
      result = savedSearchList.find(search => searchId === search.id);
    } else {
      result = savedSearchList.find(search => query === search.query);
    }

    return result ? result.name : t('Custom Search');
  }

  renderList() {
    const {
      savedSearchList,
      onSavedSearchDelete,
      onSavedSearchSelect,
      organization,
    } = this.props;

    if (savedSearchList.length === 0) {
      return <EmptyItem>{t("There don't seem to be any saved searches yet.")}</EmptyItem>;
    }

    return savedSearchList.map(search => (
      <StyledMenuItem onSelect={() => onSavedSearchSelect(search)} key={search.id}>
        {search.isPinned && <InlineSvg src={'icon-pin'} />}
        <SearchTitle>{search.name}</SearchTitle>
        <SearchQuery>{search.query}</SearchQuery>
        {search.isGlobal === false && (
          <Access
            organization={organization}
            access={['org:write']}
            renderNoAccessMessage={false}
          >
            <Confirm
              onConfirm={() => onSavedSearchDelete(search)}
              message={t('Are you sure you want to delete this saved search?')}
              stopPropagation
            >
              <Button
                title={t('Delete this saved search')}
                icon="icon-trash"
                size="xsmall"
              />
            </Confirm>
          </Access>
        )}
      </StyledMenuItem>
    ));
  }

  render() {
    const {organization, query, onSavedSearchCreate} = this.props;

    return (
      <Container>
        <div className="stream-dropdown">
          <DropdownLink btnGroup={true} title={this.getTitle()}>
            {this.renderList()}
            <Access
              organization={organization}
              access={['org:write']}
              renderNoAccessMessage={false}
            >
              <StyledMenuItem divider={true} />
              <ButtonBar>
                <SaveSearchButton
                  query={query}
                  organization={organization}
                  onSave={onSavedSearchCreate}
                />
              </ButtonBar>
            </Access>
          </DropdownLink>
        </div>
      </Container>
    );
  }
}

const SaveSearchButton = withApi(
  class SaveSearchButton extends React.Component {
    static propTypes = {
      api: PropTypes.object.isRequired,
      query: PropTypes.string.isRequired,
      organization: SentryTypes.Organization.isRequired,
      onSave: PropTypes.func.isRequired,
    };

    constructor(props) {
      super(props);
      this.state = {
        isModalOpen: false,
        isSaving: false,
        query: props.query,
        name: '',
        error: null,
      };
    }

    onSubmit = e => {
      const {api, organization, onSave} = this.props;

      e.preventDefault();

      this.setState({isSaving: true});

      addLoadingMessage(t('Saving Changes'));

      createSavedSearch(api, organization.slug, this.state.name, this.state.query)
        .then(data => {
          onSave(data);
          this.onToggle();
          this.setState({
            error: null,
            isSaving: false,
          });
          clearIndicators();
        })
        .catch(err => {
          let error = t('Unable to save your changes.');
          if (err.responseJSON && err.responseJSON.detail) {
            error = err.responseJSON.detail;
          }
          this.setState({
            error,
            isSaving: false,
          });
          clearIndicators();
        });
    };

    onToggle = () => {
      this.setState({
        isModalOpen: !this.state.isModalOpen,
      });
    };

    handleChangeName = val => {
      this.setState({name: val});
    };

    handleChangeQuery = val => {
      this.setState({query: val});
    };

    render() {
      const {isSaving, isModalOpen} = this.state;

      return (
        <React.Fragment>
          <Button
            size="xsmall"
            onClick={this.onToggle}
            data-test-id="save-current-search"
          >
            {t('Save Current Search')}
          </Button>
          <Modal show={isModalOpen} animation={false} onHide={this.onToggle}>
            <form onSubmit={this.onSubmit}>
              <div className="modal-header">
                <h4>{t('Save Current Search')}</h4>
              </div>

              <div className="modal-body">
                {this.state.error && (
                  <div className="alert alert-error alert-block">{this.state.error}</div>
                )}

                <p>{t('All team members will now have access to this search.')}</p>
                <TextField
                  key="name"
                  name="name"
                  label={t('Name')}
                  placeholder="e.g. My Search Results"
                  required={true}
                  onChange={this.handleChangeName}
                />
                <TextField
                  key="query"
                  name="query"
                  label={t('Query')}
                  value={this.props.query}
                  required={true}
                  onChange={this.handleChangeQuery}
                />
              </div>
              <div className="modal-footer">
                <Button
                  priority="default"
                  size="small"
                  disabled={isSaving}
                  onClick={this.onToggle}
                  style={{marginRight: space(1)}}
                >
                  {t('Cancel')}
                </Button>
                <Button priority="primary" size="small" disabled={isSaving}>
                  {t('Save')}
                </Button>
              </div>
            </form>
          </Modal>
        </React.Fragment>
      );
    }
  }
);

const Container = styled.div`
  & .dropdown-menu {
    max-width: 350px;
    min-width: 275px;
  }
`;

const SearchTitle = styled.strong`
  display: block;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  color: ${p => p.theme.gray5};
  padding: 0;
  background: inherit;
`;

const SearchQuery = styled.code`
  display: block;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  color: ${p => p.theme.gray5};
  padding: 0;
  background: inherit;
`;

const StyledMenuItem = styled(MenuItem)`
  position: relative;

  & a {
    /* override shared-components.less */
    padding: ${space(0.25)} ${space(1)} !important;
  }

  & button {
    display: none;
  }

  &:focus,
  &:hover button {
    display: block;
    position: absolute;
    top: ${space(0.5)};
    right: ${space(1)};
  }
`;

const EmptyItem = styled.li`
  padding: 8px 10px 5px;
  font-style: italic;
`;

const ButtonBar = styled.li`
  padding: ${space(0.5)} ${space(1)};
  display: flex;
  justify-content: space-between;

  & a {
    /* need to override .dropdown-menu li a in shared-components.less */
    padding: 0 !important;
    line-height: 1 !important;
  }
`;
